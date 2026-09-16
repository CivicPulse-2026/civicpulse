"""Helpers shared by the complaint / admin routers."""

from __future__ import annotations

import math
from datetime import datetime, timezone

from app.models.enums import CATEGORY_DEPARTMENT
from app.services.priority_engine import score_complaint


def now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(dt):
    """Mongo returns naive UTC datetimes; make them aware for safe comparison."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def serialize(doc: dict) -> dict:
    if not doc:
        return doc

    out = dict(doc)

    out["id"] = str(out.pop("_id"))

    # Embeddings are internal backend data.
    # Do not expose them through the API.
    out.pop("embedding", None)

    for key, value in list(out.items()):
        if hasattr(value, "generation_time"):
            out[key] = str(value)

    return out


async def generate_ticket_id(db) -> str:
    year = now().year
    count = await db.complaints.count_documents({})
    seq = count + 1
    while True:
        candidate = f"CP-{year}-{seq:06d}"
        if not await db.complaints.find_one({"ticket_id": candidate}):
            return candidate
        seq += 1


def _haversine_m(lat1, lng1, lat2, lng2) -> float:
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


async def count_similar(db, *, category: str, lat: float, lng: float, radius_m: float = 400) -> int:
    cursor = db.complaints.find(
        {"category": category, "status": {"$ne": "Resolved"}},
        {"location": 1},
    )
    count = 0
    async for c in cursor:
        loc = c.get("location") or {}
        if "lat" in loc and "lng" in loc:
            if _haversine_m(lat, lng, loc["lat"], loc["lng"]) <= radius_m:
                count += 1
    return count


async def build_priority(db, *, category, description, lat, lng, created_at=None) -> dict:
    similar = await count_similar(db, category=category, lat=lat, lng=lng)
    breakdown = score_complaint(
        category=category,
        description=description,
        created_at=created_at,
        similar_count=similar,
    )
    breakdown["similar_count"] = similar
    return breakdown


def department_for(category: str) -> str:
    return CATEGORY_DEPARTMENT.get(category, "General Services")
