from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.core.database import get_database
from app.core.security import get_current_user
from app.models.enums import Status
from app.schemas.complaint import AnalyzeRequest, AnalyzeResponse
from app.services.ai_analyzer import analyze_complaint
from app.services.complaint_service import (
    build_priority,
    department_for,
    generate_ticket_id,
    now,
    serialize,
)
from app.services.priority_engine import score_complaint

from app.services.similarity_service import (
    find_similar_complaints,
    generate_embedding,
)

from app.services.cluster_service import (
    assign_complaint_to_cluster,
)

from app.services.storage import save_photo

router = APIRouter(prefix="/complaints", tags=["complaints"])


def _resolve_query(id_or_ticket: str) -> dict:
    try:
        return {"_id": ObjectId(id_or_ticket)}
    except (InvalidId, TypeError):
        return {"ticket_id": id_or_ticket}


async def _fetch(db, id_or_ticket: str) -> dict:
    doc = await db.complaints.find_one(_resolve_query(id_or_ticket))
    if not doc:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return doc


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest):
    ai_analysis = await analyze_complaint(payload.description)

    breakdown = score_complaint(
        category=ai_analysis.category,
        description=payload.description,
    )

    return AnalyzeResponse(
        ai_analysis=ai_analysis,
        priority=breakdown["priority"],
        priority_score=breakdown["score"],
        sla_hours=breakdown["sla_hours"],
        keywords=breakdown["keywords"],
        factors=breakdown["factors"],
    )


@router.post("")
async def create_complaint(
    category: str = Form(...),
    description: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    address: Optional[str] = Form(None),
    ward: Optional[str] = Form(None),
    reporter_name: Optional[str] = Form(None),
    reporter_contact: Optional[str] = Form(None),
    photos: list[UploadFile] | None = File(default=None),
    db=Depends(get_database),
):
    incoming = [p for p in (photos or []) if p.filename]

    if len(incoming) > settings.max_photos_per_complaint:
        raise HTTPException(
            status_code=400,
            detail=f"You can attach at most {settings.max_photos_per_complaint} photos.",
        )

    # ---------------------------------------------------------
    # 1. Save uploaded photos
    # ---------------------------------------------------------

    saved: list[str] = []

    for photo in incoming:
        content_type = (photo.content_type or "").lower()

        if content_type not in settings.allowed_image_type_set:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"'{photo.filename}' is not a supported image type. "
                    f"Allowed: {', '.join(sorted(settings.allowed_image_type_set))}."
                ),
            )

        data = await photo.read()

        if not data:
            continue

        if len(data) > settings.max_photo_bytes:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"'{photo.filename}' exceeds the "
                    f"{settings.max_photo_mb:g} MB limit."
                ),
            )

        saved.append(save_photo(data, photo.filename))

    # ---------------------------------------------------------
    # 2. Local AI analysis
    # ---------------------------------------------------------

    try:
        ai_analysis = await analyze_complaint(description)
    except Exception as exc:
        # AI failure should never prevent complaint submission.
        print(f"AI analysis failed: {exc}")
        ai_analysis = None

    # ---------------------------------------------------------
    # 3. Use AI category when available
    # ---------------------------------------------------------

    final_category = category

    if (
        ai_analysis is not None
        and ai_analysis.confidence > 0
    ):
        final_category = ai_analysis.category

    # ---------------------------------------------------------
    # 4. Generate local semantic embedding
    # ---------------------------------------------------------

    try:
        embedding = generate_embedding(description)
    except Exception as exc:
        # Embedding failure should never prevent complaint submission.
        print(f"Embedding generation failed: {exc}")
        embedding = []


    # ---------------------------------------------------------
    # 5. Find similar existing complaints
    # ---------------------------------------------------------

    try:
        similar_complaints = await find_similar_complaints(
            db,
            description=description,
            lat=lat,
            lng=lng,
        )
    except Exception as exc:
        # Similarity failure should never prevent complaint submission.
        print(f"Similarity detection failed: {exc}")
        similar_complaints = []


    duplicate_matches = [
        item
        for item in similar_complaints
        if item["relationship"] == "DUPLICATE"
    ]

    related_matches = [
        item
        for item in similar_complaints
        if item["relationship"] == "RELATED"
    ]


    # ---------------------------------------------------------
    # 6. Rule-based priority
    # ---------------------------------------------------------

    created = now()

    breakdown = await build_priority(
        db,
        category=final_category,
        description=description,
        lat=lat,
        lng=lng,
        created_at=created,
    )

    ticket_id = await generate_ticket_id(db)

    from datetime import timedelta

    # ---------------------------------------------------------
    # 7. Build complaint document
    # ---------------------------------------------------------

    doc = {
        "ticket_id": ticket_id,

        "category": final_category,

        "description": description,

        "status": Status.NEW.value,

        # Final operational priority comes from rule engine.
        "priority": breakdown["priority"],
        "priority_score": breakdown["score"],

        "department": department_for(final_category),

        "location": {
            "lat": lat,
            "lng": lng,
            "address": address,
            "ward": ward,
        },

        "photos": saved,

        "reporter_name": reporter_name,
        "reporter_contact": reporter_contact,

        "assigned_to": None,

        "cluster_id": None,

        # ---------------------------------------------------------
        # Semantic similarity / duplicate detection
        # ---------------------------------------------------------

        "embedding": embedding,

        "duplicate_status": (
            "DUPLICATE"
            if duplicate_matches
            else "RELATED"
            if related_matches
            else "UNRELATED"
        ),

        "duplicate_of": (
            duplicate_matches[0]["ticket_id"]
            if duplicate_matches
            else None
        ),

        "similarity_score": (
            duplicate_matches[0]["similarity_score"]
            if duplicate_matches
            else (
                related_matches[0]["similarity_score"]
                if related_matches
                else None
            )
        ),

        "similarity_distance_m": (
            duplicate_matches[0]["distance_m"]
            if duplicate_matches
            else (
                related_matches[0]["distance_m"]
                if related_matches
                else None
            )
        ),

        "similar_complaints": similar_complaints,

        "sla_due_at": created + timedelta(
            hours=breakdown["sla_hours"]
        ),

        "similar_count": breakdown["similar_count"],

        "factors": breakdown["factors"],

        # -----------------------------------------------------
        # Local AI result
        # -----------------------------------------------------

        "ai_analysis": (
            ai_analysis.model_dump()
            if ai_analysis is not None
            else None
        ),

        "created_at": created,
        "updated_at": created,
        "resolved_at": None,
    }

    # ---------------------------------------------------------
    # 8. Insert into MongoDB
    # ---------------------------------------------------------

    result = await db.complaints.insert_one(doc)

    doc["_id"] = result.inserted_id

    # ---------------------------------------------------------
    # 9. Assign complaint to a cluster
    # ---------------------------------------------------------

    cluster = None

    if similar_complaints:
        try:
            cluster = await assign_complaint_to_cluster(
                db,
                complaint=doc,
                similar_complaints=similar_complaints,
            )

            if cluster:
                cluster_id = cluster["cluster_id"]

                await db.complaints.update_one(
                    {"_id": result.inserted_id},
                    {
                        "$set": {
                            "cluster_id": cluster_id,
                            "updated_at": now(),
                        }
                    },
                )

                doc["cluster_id"] = cluster_id

        except Exception as exc:
            # Clustering failure must never prevent complaint creation.
            print(f"Clustering failed: {exc}")

    # ---------------------------------------------------------
    # 10. Audit event
    # ---------------------------------------------------------

    await db.audit_events.insert_one({
        "complaint_id": str(result.inserted_id),
        "action": "created",
        "actor_name": reporter_name or "Citizen",
        "detail": (
            f"Complaint submitted "
            f"(priority {breakdown['priority']})."
        ),
        "created_at": created,
    })

    # ---------------------------------------------------------
    # 11. Return complaint
    # ---------------------------------------------------------

    return {
        "complaint": serialize(doc)
    }


@router.get("/mine/list")
async def my_complaints(db=Depends(get_database), user=Depends(get_current_user)):
    """Complaints reported by the signed-in user, newest first.

    We match on the reporter contact (their email) or name, since that's what
    the report form attaches from the authenticated account.
    """
    query = {
        "$or": [
            {"reporter_contact": user.get("email")},
            {"reporter_name": user.get("name")},
        ]
    }
    cursor = db.complaints.find(query).sort("created_at", -1)
    items = [serialize(c) async for c in cursor]
    summary = {
        "total": len(items),
        "open": sum(1 for c in items if c.get("status") != Status.RESOLVED.value),
        "resolved": sum(1 for c in items if c.get("status") == Status.RESOLVED.value),
    }
    return {"complaints": items, "summary": summary}


@router.get("/{id_or_ticket}")
async def get_complaint(id_or_ticket: str, db=Depends(get_database)):
    doc = await _fetch(db, id_or_ticket)
    return {"complaint": serialize(doc)}


@router.patch("/{id_or_ticket}/resolve")
async def resolve(id_or_ticket: str, db=Depends(get_database), user=Depends(get_current_user)):
    doc = await _fetch(db, id_or_ticket)
    ts = now()
    await db.complaints.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": Status.RESOLVED.value, "resolved_at": ts, "updated_at": ts}},
    )
    await db.audit_events.insert_one({
        "complaint_id": str(doc["_id"]),
        "action": "resolved",
        "actor_name": user["name"],
        "detail": "Marked as resolved.",
        "created_at": ts,
    })
    return {"complaint": serialize(await db.complaints.find_one({"_id": doc["_id"]}))}


@router.patch("/{id_or_ticket}/reopen")
async def reopen(id_or_ticket: str, db=Depends(get_database), user=Depends(get_current_user)):
    doc = await _fetch(db, id_or_ticket)
    ts = now()
    await db.complaints.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": Status.REOPENED.value, "resolved_at": None, "updated_at": ts}},
    )
    await db.audit_events.insert_one({
        "complaint_id": str(doc["_id"]),
        "action": "reopened",
        "actor_name": user["name"],
        "detail": "Complaint reopened.",
        "created_at": ts,
    })
    return {"complaint": serialize(await db.complaints.find_one({"_id": doc["_id"]}))}


@router.get("/{id_or_ticket}/comments")
async def list_comments(id_or_ticket: str, db=Depends(get_database)):
    doc = await _fetch(db, id_or_ticket)
    cursor = db.comments.find({"complaint_id": str(doc["_id"])}).sort("created_at", 1)
    return {"comments": [serialize(c) async for c in cursor]}


@router.post("/{id_or_ticket}/comments")
async def add_comment(
    id_or_ticket: str,
    payload: dict,
    db=Depends(get_database),
    user=Depends(get_current_user),
):
    doc = await _fetch(db, id_or_ticket)
    text = (payload or {}).get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text is required.")
    ts = now()
    comment = {
        "complaint_id": str(doc["_id"]),
        "author_name": user["name"],
        "author_role": user["role"],
        "text": text,
        "created_at": ts,
    }
    res = await db.comments.insert_one(comment)
    comment["_id"] = res.inserted_id
    return {"comment": serialize(comment)}


@router.get("/{id_or_ticket}/audit")
async def audit_trail(id_or_ticket: str, db=Depends(get_database)):
    doc = await _fetch(db, id_or_ticket)
    cursor = db.audit_events.find({"complaint_id": str(doc["_id"])}).sort("created_at", 1)
    return {"events": [serialize(e) async for e in cursor]}
