from collections import defaultdict
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.database import get_database
from app.core.security import require_roles
from app.models.enums import Status
from app.services.nyc311_importer import import_nyc_311

router = APIRouter(prefix="/admin/map", tags=["map"])

staff = require_roles("officer", "admin")
admin_only = require_roles("admin")


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
async def map_clusters(
    db=Depends(get_database),
    _=Depends(staff),
):
    """Group open complaints into coarse geo-buckets to reveal hotspots."""

    grid: dict = defaultdict(list)

    async for c in db.complaints.find(
        {"status": {"$ne": Status.RESOLVED.value}}
    ):
        loc = c.get("location") or {}

        if "lat" not in loc or "lng" not in loc:
            continue

        key = (
            round(loc["lat"], 2),
            round(loc["lng"], 2),
        )

        grid[key].append(c)

    clusters = []

    for (lat, lng), items in grid.items():
        if len(items) < 2:
            continue

        cats = defaultdict(int)

        for it in items:
            cats[it.get("category", "Other")] += 1

        dominant = max(
            cats,
            key=cats.get,
        )

        clusters.append({
            "lat": lat,
            "lng": lng,
            "count": len(items),
            "dominant_category": dominant,
            "top_priority": max(
                items,
                key=lambda x: x.get(
                    "priority_score",
                    0,
                ),
            ).get("priority"),
        })

    clusters.sort(
        key=lambda x: x["count"],
        reverse=True,
    )

    return {"clusters": clusters}


@router.get("/fleet")
async def map_fleet(
    db=Depends(get_database),
    _=Depends(staff),
):
    """Complaints currently in progress -> where crews are working."""

    fleet = []

    async for c in db.complaints.find(
        {"status": Status.IN_PROGRESS.value}
    ):
        loc = c.get("location") or {}

        if "lat" in loc and "lng" in loc:
            fleet.append({
                "id": str(c["_id"]),
                "ticket_id": c.get("ticket_id"),
                "lat": loc["lat"],
                "lng": loc["lng"],
                "crew": c.get(
                    "crew",
                    "Unassigned crew",
                ),
                "category": c.get("category"),
            })

    return {"fleet": fleet}


@router.get("/heatmap")
async def map_heatmap(
    db=Depends(get_database),
    _=Depends(staff),
):
    points = []

    async for c in db.complaints.find(
        {},
        {
            "location": 1,
            "priority_score": 1,
        },
    ):
        loc = c.get("location") or {}

        if "lat" in loc and "lng" in loc:
            weight = round(
                min(
                    1.0,
                    c.get(
                        "priority_score",
                        0,
                    ) / 100,
                ),
                2,
            )

            points.append([
                loc["lat"],
                loc["lng"],
                weight,
            ])

    return {"points": points}


# ============================================================
# NYC 311 DATA
# ============================================================

@router.post("/nyc-311/import")
async def import_nyc_311_data(
    db=Depends(get_database),
    _=Depends(admin_only),
):
    """
    Import the prepared NYC 311 sample into MongoDB.

    NYC 311 data is stored separately from live CivicPulse
    complaints in the demo_service_requests collection.
    """

    file_path = (
        Path(__file__)
        .resolve()
        .parents[3]
        / "data"
        / "raw"
        / "nyc_311_sample.csv"
    )

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "NYC 311 dataset not found: "
                f"{file_path}"
            ),
        )

    result = await import_nyc_311(
        db,
        file_path,
    )

    return result


@router.get("/nyc-311")
async def map_nyc_311(
    category: str | None = Query(default=None),
    status: str | None = Query(default=None),
    borough: str | None = Query(default=None),
    limit: int = Query(default=1000, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db=Depends(get_database),
    _=Depends(staff),
):
    """
    Return paginated NYC 311 records for the Civic Intelligence Map.

    NYC 311 data is kept separate from live CivicPulse complaints.
    """

    query: dict = {}

    if category:
        query["category"] = category

    if status:
        query["status"] = status

    if borough:
        query["location.borough"] = borough

    total = await db.demo_service_requests.count_documents(query)

    cursor = (
        db.demo_service_requests
        .find(
            query,
            {
                "_id": 1,
                "source_id": 1,
                "category": 1,
                "subcategory": 1,
                "description": 1,
                "status": 1,
                "agency": 1,
                "agency_name": 1,
                "location": 1,
                "created_at": 1,
                "closed_at": 1,
            },
        )
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )

    points = []

    async for c in cursor:
        loc = c.get("location") or {}

        if (
            loc.get("lat") is None
            or loc.get("lng") is None
        ):
            continue

        points.append({
            "id": str(c["_id"]),
            "source_id": c.get("source_id"),
            "source": "NYC_311",
            "lat": loc["lat"],
            "lng": loc["lng"],
            "category": c.get("category"),
            "subcategory": c.get("subcategory"),
            "description": c.get("description"),
            "status": c.get("status"),
            "agency": c.get("agency"),
            "agency_name": c.get("agency_name"),
            "address": loc.get("address"),
            "borough": loc.get("borough"),
            "city": loc.get("city"),
            "zip": loc.get("zip"),
        })

    return {
        "source": "NYC_311",
        "points": points,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "returned": len(points),
            "has_more": offset + len(points) < total,
        },
    }