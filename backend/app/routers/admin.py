from datetime import timedelta

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_database
from app.core.security import require_roles
from app.models.enums import STATUS_TRANSITIONS, Status
from app.schemas.admin import (
    AssignRequest,
    BulkAssignRequest,
    DispatchRequest,
    EscalateRequest,
    NoteCreate,
    NotifyRequest,
    StatusUpdate,
)
from app.services.complaint_service import now, serialize
from app.services.priority_engine import band_for_score

router = APIRouter(prefix="/admin", tags=["admin"])
staff = require_roles("officer", "admin")


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid id.")


async def _fetch(db, complaint_id: str) -> dict:
    doc = await db.complaints.find_one({"_id": _oid(complaint_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return doc


async def _audit(db, complaint_id, action, actor_name, detail):
    await db.audit_events.insert_one({
        "complaint_id": complaint_id,
        "action": action,
        "actor_name": actor_name,
        "detail": detail,
        "created_at": now(),
    })


@router.get("/complaints")
async def list_complaints(
    status: str | None = None,
    category: str | None = None,
    priority: str | None = None,
    q: str | None = None,
    sort: str = "priority_score",
    page: int = 1,
    page_size: int = 20,
    db=Depends(get_database),
    _=Depends(staff),
):
    query: dict = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    if q:
        query["$or"] = [
            {"ticket_id": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"location.address": {"$regex": q, "$options": "i"}},
        ]

    total = await db.complaints.count_documents(query)
    direction = -1 if sort in ("priority_score", "created_at", "updated_at") else 1
    cursor = (
        db.complaints.find(query)
        .sort(sort, direction)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    items = [serialize(c) async for c in cursor]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/complaints/{complaint_id}")
async def get_complaint(complaint_id: str, db=Depends(get_database), _=Depends(staff)):
    doc = await _fetch(db, complaint_id)
    cid = str(doc["_id"])
    comments = [serialize(c) async for c in db.comments.find({"complaint_id": cid}).sort("created_at", 1)]
    events = [serialize(e) async for e in db.audit_events.find({"complaint_id": cid}).sort("created_at", 1)]
    notes = [serialize(n) async for n in db.notes.find({"complaint_id": cid}).sort("created_at", 1)]
    return {"complaint": serialize(doc), "comments": comments, "audit": events, "notes": notes}


@router.patch("/complaints/{complaint_id}/status")
async def update_status(complaint_id: str, payload: StatusUpdate, db=Depends(get_database), user=Depends(staff)):
    doc = await _fetch(db, complaint_id)
    current = doc["status"]
    target = payload.status
    allowed = STATUS_TRANSITIONS.get(current, set())
    if target != current and target not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move from '{current}' to '{target}'. Allowed: {sorted(allowed)}",
        )
    ts = now()
    update = {"status": target, "updated_at": ts}
    if target == Status.RESOLVED.value:
        update["resolved_at"] = ts
    await db.complaints.update_one({"_id": doc["_id"]}, {"$set": update})
    await _audit(db, str(doc["_id"]), "status_changed", user["name"],
                 payload.note or f"Status {current} -> {target}")
    return {"complaint": serialize(await db.complaints.find_one({"_id": doc["_id"]}))}


@router.patch("/complaints/{complaint_id}/assign")
async def assign(complaint_id: str, payload: AssignRequest, db=Depends(get_database), user=Depends(staff)):
    doc = await _fetch(db, complaint_id)
    ts = now()
    new_status = doc["status"]
    if doc["status"] == Status.NEW.value:
        new_status = Status.ASSIGNED.value
    await db.complaints.update_one(
        {"_id": doc["_id"]},
        {"$set": {"assigned_to": payload.assigned_to, "status": new_status, "updated_at": ts}},
    )
    await _audit(db, str(doc["_id"]), "assigned", user["name"],
                 payload.note or f"Assigned to {payload.assigned_to}")
    return {"complaint": serialize(await db.complaints.find_one({"_id": doc["_id"]}))}


@router.patch("/complaints/{complaint_id}/dispatch")
async def dispatch(complaint_id: str, payload: DispatchRequest, db=Depends(get_database), user=Depends(staff)):
    doc = await _fetch(db, complaint_id)
    ts = now()
    update = {"status": Status.IN_PROGRESS.value, "updated_at": ts, "crew": payload.crew}
    if payload.eta_hours:
        update["eta_at"] = ts + timedelta(hours=payload.eta_hours)
    await db.complaints.update_one({"_id": doc["_id"]}, {"$set": update})
    await _audit(db, str(doc["_id"]), "dispatched", user["name"],
                 payload.note or f"Crew {payload.crew} dispatched")
    return {"complaint": serialize(await db.complaints.find_one({"_id": doc["_id"]}))}


@router.post("/complaints/{complaint_id}/escalate")
async def escalate(complaint_id: str, payload: EscalateRequest, db=Depends(get_database), user=Depends(staff)):
    doc = await _fetch(db, complaint_id)
    ts = now()
    new_score = min(100, doc.get("priority_score", 0) + 20)
    priority, sla = band_for_score(new_score)
    await db.complaints.update_one(
        {"_id": doc["_id"]},
        {"$set": {"priority_score": new_score, "priority": priority,
                  "escalated": True, "updated_at": ts}},
    )
    await _audit(db, str(doc["_id"]), "escalated", user["name"], payload.reason)
    return {"complaint": serialize(await db.complaints.find_one({"_id": doc["_id"]}))}


@router.post("/complaints/{complaint_id}/notify")
async def notify(complaint_id: str, payload: NotifyRequest, db=Depends(get_database), user=Depends(staff)):
    doc = await _fetch(db, complaint_id)
    await _audit(db, str(doc["_id"]), "notified", user["name"],
                 f"[{payload.channel}] {payload.message}")
    return {"message": "Notification logged."}


@router.get("/complaints/{complaint_id}/notes")
async def list_notes(complaint_id: str, db=Depends(get_database), _=Depends(staff)):
    cursor = db.notes.find({"complaint_id": complaint_id}).sort("created_at", 1)
    return {"notes": [serialize(n) async for n in cursor]}


@router.post("/complaints/{complaint_id}/notes")
async def add_note(complaint_id: str, payload: NoteCreate, db=Depends(get_database), user=Depends(staff)):
    doc = await _fetch(db, complaint_id)
    ts = now()
    note = {
        "complaint_id": str(doc["_id"]),
        "text": payload.text,
        "type": payload.type,
        "author_name": user["name"],
        "created_at": ts,
    }
    res = await db.notes.insert_one(note)
    note["_id"] = res.inserted_id
    return {"note": serialize(note)}


@router.post("/complaints/bulk-assign")
async def bulk_assign(payload: BulkAssignRequest, db=Depends(get_database), user=Depends(staff)):
    ids = [_oid(i) for i in payload.complaint_ids]
    ts = now()
    await db.complaints.update_many(
        {"_id": {"$in": ids}, "status": Status.NEW.value},
        {"$set": {"assigned_to": payload.assigned_to, "status": Status.ASSIGNED.value, "updated_at": ts}},
    )
    await db.complaints.update_many(
        {"_id": {"$in": ids}, "status": {"$ne": Status.NEW.value}},
        {"$set": {"assigned_to": payload.assigned_to, "updated_at": ts}},
    )
    return {"message": f"Assigned {len(ids)} complaints to {payload.assigned_to}."}
