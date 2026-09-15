from collections import defaultdict

from fastapi import APIRouter, Depends

from app.core.database import get_database
from app.core.security import require_roles
from app.models.enums import Status

router = APIRouter(prefix="/admin/map", tags=["map"])
staff = require_roles("officer", "admin")


@router.get("/complaints")
async def map_complaints(
    status: str | None = None,
    category: str | None = None,
    priority: str | None = None,
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
    points = []
    async for c in db.complaints.find(query):
        loc = c.get("location") or {}
        if "lat" in loc and "lng" in loc:
            points.append({
                "id": str(c["_id"]),
                "ticket_id": c.get("ticket_id"),
                "lat": loc["lat"],
                "lng": loc["lng"],
                "category": c.get("category"),
                "priority": c.get("priority"),
                "status": c.get("status"),
                "address": loc.get("address"),
            })
    return {"points": points}


@router.get("/clusters")
async def map_clusters(db=Depends(get_database), _=Depends(staff)):
    """Group open complaints into coarse geo-buckets to reveal hotspots."""
    grid: dict = defaultdict(list)
    async for c in db.complaints.find({"status": {"$ne": Status.RESOLVED.value}}):
        loc = c.get("location") or {}
        if "lat" not in loc or "lng" not in loc:
            continue
        key = (round(loc["lat"], 2), round(loc["lng"], 2))
        grid[key].append(c)
    clusters = []
    for (lat, lng), items in grid.items():
        if len(items) < 2:
            continue
        cats = defaultdict(int)
        for it in items:
            cats[it.get("category", "Other")] += 1
        dominant = max(cats, key=cats.get)
        clusters.append({
            "lat": lat,
            "lng": lng,
            "count": len(items),
            "dominant_category": dominant,
            "top_priority": max(items, key=lambda x: x.get("priority_score", 0)).get("priority"),
        })
    clusters.sort(key=lambda x: x["count"], reverse=True)
    return {"clusters": clusters}


@router.get("/fleet")
async def map_fleet(db=Depends(get_database), _=Depends(staff)):
    """Complaints currently in progress -> where crews are working."""
    fleet = []
    async for c in db.complaints.find({"status": Status.IN_PROGRESS.value}):
        loc = c.get("location") or {}
        if "lat" in loc and "lng" in loc:
            fleet.append({
                "id": str(c["_id"]),
                "ticket_id": c.get("ticket_id"),
                "lat": loc["lat"],
                "lng": loc["lng"],
                "crew": c.get("crew", "Unassigned crew"),
                "category": c.get("category"),
            })
    return {"fleet": fleet}


@router.get("/heatmap")
async def map_heatmap(db=Depends(get_database), _=Depends(staff)):
    points = []
    async for c in db.complaints.find({}, {"location": 1, "priority_score": 1}):
        loc = c.get("location") or {}
        if "lat" in loc and "lng" in loc:
            weight = round(min(1.0, c.get("priority_score", 0) / 100), 2)
            points.append([loc["lat"], loc["lng"], weight])
    return {"points": points}
