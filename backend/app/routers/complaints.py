import os
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.core.database import get_database
from app.core.security import get_current_user
from app.models.enums import Status
from app.schemas.complaint import AnalyzeRequest, AnalyzeResponse
from app.services.ai_analyzer import suggest_category
from app.services.complaint_service import (
    build_priority,
    department_for,
    generate_ticket_id,
    now,
    serialize,
)
from app.services.priority_engine import score_complaint
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
    category = suggest_category(payload.description)
    breakdown = score_complaint(category=category, description=payload.description)
    return AnalyzeResponse(
        suggested_category=category,
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
    photos: list[UploadFile] = File(default=[]),
    db=Depends(get_database),
):
    incoming = [p for p in (photos or []) if p.filename]
    if len(incoming) > settings.max_photos_per_complaint:
        raise HTTPException(
            status_code=400,
            detail=f"You can attach at most {settings.max_photos_per_complaint} photos.",
        )

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
                detail=f"'{photo.filename}' exceeds the {settings.max_photo_mb:g} MB limit.",
            )
        saved.append(save_photo(data, photo.filename))

    created = now()
    breakdown = await build_priority(
        db, category=category, description=description, lat=lat, lng=lng, created_at=created
    )
    ticket_id = await generate_ticket_id(db)
    from datetime import timedelta

    doc = {
        "ticket_id": ticket_id,
        "category": category,
        "description": description,
        "status": Status.NEW.value,
        "priority": breakdown["priority"],
        "priority_score": breakdown["score"],
        "department": department_for(category),
        "location": {"lat": lat, "lng": lng, "address": address, "ward": ward},
        "photos": saved,
        "reporter_name": reporter_name,
        "reporter_contact": reporter_contact,
        "assigned_to": None,
        "cluster_id": None,
        "sla_due_at": created + timedelta(hours=breakdown["sla_hours"]),
        "similar_count": breakdown["similar_count"],
        "factors": breakdown["factors"],
        "created_at": created,
        "updated_at": created,
        "resolved_at": None,
    }
    result = await db.complaints.insert_one(doc)
    doc["_id"] = result.inserted_id

    await db.audit_events.insert_one({
        "complaint_id": str(result.inserted_id),
        "action": "created",
        "actor_name": reporter_name or "Citizen",
        "detail": f"Complaint submitted (priority {breakdown['priority']}).",
        "created_at": created,
    })
    return {"complaint": serialize(doc)}


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
