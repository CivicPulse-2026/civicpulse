"""
CivicPulse complaint clustering service.

A cluster represents multiple complaints that refer to the same
underlying civic issue.

Clustering is based on the existing similarity pipeline:
    DUPLICATE -> same cluster
    RELATED   -> may join an existing cluster
    UNRELATED -> no cluster

No external AI API is used here.
"""

from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId

from app.services.similarity_service import find_similar_complaints


def now() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(timezone.utc)


async def generate_cluster_id(db) -> str:
    """
    Generate a human-readable CivicPulse cluster ID.

    Example:
        CL-2026-000001
    """
    year = now().year

    count = await db.complaint_clusters.count_documents({})
    sequence = count + 1

    while True:
        cluster_id = f"CL-{year}-{sequence:06d}"

        existing = await db.complaint_clusters.find_one(
            {"cluster_id": cluster_id}
        )

        if not existing:
            return cluster_id

        sequence += 1


async def get_cluster_for_complaint(
    db,
    ticket_id: str,
) -> dict | None:
    """Find the cluster containing a particular complaint."""
    return await db.complaint_clusters.find_one(
        {"complaint_ids": ticket_id}
    )


async def get_oldest_complaint(
    db,
    ticket_ids: list[str],
) -> dict | None:
    """
    Return the oldest complaint from a list of ticket IDs.

    This becomes the representative/canonical complaint for a new
    cluster.
    """
    if not ticket_ids:
        return None

    complaint = await db.complaints.find_one(
        {
            "ticket_id": {
                "$in": ticket_ids
            }
        },
        sort=[
            ("created_at", 1),
        ],
    )

    return complaint


async def create_cluster(
    db,
    *,
    complaint: dict,
    complaint_ids: list[str] | None = None,
) -> dict:
    """
    Create a new complaint cluster.

    The oldest complaint in the cluster becomes the representative
    complaint.
    """
    cluster_id = await generate_cluster_id(db)

    complaint_ids = list(
        dict.fromkeys(
            complaint_ids or [complaint["ticket_id"]]
        )
    )

    representative = await get_oldest_complaint(
        db,
        complaint_ids,
    )

    if representative:
        representative_ticket_id = representative["ticket_id"]
        representative_category = representative.get(
            "category",
            complaint.get("category", "Other"),
        )
        representative_location = representative.get(
            "location"
        ) or {}
    else:
        representative_ticket_id = complaint["ticket_id"]
        representative_category = complaint.get(
            "category",
            "Other",
        )
        representative_location = complaint.get(
            "location"
        ) or {}

    cluster = {
        "cluster_id": cluster_id,

        "title": _build_cluster_title(
            category=representative_category,
            location=representative_location,
        ),

        "category": representative_category,

        "status": "OPEN",

        "complaint_ids": complaint_ids,

        "representative_complaint_id": representative_ticket_id,

        "complaint_count": len(complaint_ids),

        "location": {
            "lat": representative_location.get("lat"),
            "lng": representative_location.get("lng"),
            "address": representative_location.get("address"),
            "ward": representative_location.get("ward"),
        },

        "created_at": now(),
        "updated_at": now(),
    }

    await db.complaint_clusters.insert_one(cluster)

    return cluster


async def add_complaint_to_cluster(
    db,
    *,
    cluster_id: str,
    ticket_id: str,
) -> dict | None:
    """
    Add a complaint to an existing cluster.

    The operation is idempotent.
    """
    result = await db.complaint_clusters.update_one(
        {"cluster_id": cluster_id},
        {
            "$addToSet": {
                "complaint_ids": ticket_id,
            },
            "$set": {
                "updated_at": now(),
            },
        },
    )

    if result.matched_count == 0:
        return None

    cluster = await db.complaint_clusters.find_one(
        {"cluster_id": cluster_id}
    )

    if not cluster:
        return None

    complaint_count = len(
        cluster.get("complaint_ids", [])
    )

    await db.complaint_clusters.update_one(
        {"cluster_id": cluster_id},
        {
            "$set": {
                "complaint_count": complaint_count,
                "updated_at": now(),
            }
        },
    )

    return await db.complaint_clusters.find_one(
        {"cluster_id": cluster_id}
    )


async def find_existing_cluster(
    db,
    *,
    similar_complaints: list[dict],
) -> dict | None:
    """
    Find an existing cluster associated with any similar complaint.

    DUPLICATE matches are preferred over RELATED matches.
    """
    if not similar_complaints:
        return None

    ordered_matches = sorted(
        similar_complaints,
        key=lambda item: (
            item.get("relationship") != "DUPLICATE",
            -float(
                item.get(
                    "similarity_score",
                    0,
                )
            ),
        ),
    )

    for match in ordered_matches:
        ticket_id = match.get("ticket_id")

        if not ticket_id:
            continue

        cluster = await get_cluster_for_complaint(
            db,
            ticket_id,
        )

        if cluster:
            return cluster

    return None


async def assign_complaint_to_cluster(
    db,
    *,
    complaint: dict,
    similar_complaints: list[dict],
) -> dict | None:
    """
    Determine whether a complaint belongs to an existing cluster.

    Behaviour:

    1. No similar complaints:
       No cluster is created.

    2. Similar complaint has an existing cluster:
       Add the new complaint to that cluster.

    3. Similar complaints exist but none have a cluster:
       Create a new cluster containing the current complaint
       and the matching complaints.
    """
    if not similar_complaints:
        return None

    ticket_id = complaint["ticket_id"]

    # ---------------------------------------------------------
    # 1. Check for an existing cluster
    # ---------------------------------------------------------

    existing_cluster = await find_existing_cluster(
        db,
        similar_complaints=similar_complaints,
    )

    if existing_cluster:
        cluster_id = existing_cluster["cluster_id"]

        cluster = await add_complaint_to_cluster(
            db,
            cluster_id=cluster_id,
            ticket_id=ticket_id,
        )

        if cluster:
            return cluster

    # ---------------------------------------------------------
    # 2. Create a new cluster
    # ---------------------------------------------------------

    matching_ticket_ids = [
        item["ticket_id"]
        for item in similar_complaints
        if item.get("ticket_id")
    ]

    complaint_ids = list(
        dict.fromkeys(
            [ticket_id] + matching_ticket_ids
        )
    )

    cluster = await create_cluster(
        db,
        complaint=complaint,
        complaint_ids=complaint_ids,
    )

    # ---------------------------------------------------------
    # 3. Attach existing complaints to the cluster
    # ---------------------------------------------------------

    if matching_ticket_ids:
        await db.complaints.update_many(
            {
                "ticket_id": {
                    "$in": matching_ticket_ids
                }
            },
            {
                "$set": {
                    "cluster_id": cluster["cluster_id"],
                    "updated_at": now(),
                }
            },
        )

    return cluster


def _build_cluster_title(
    *,
    category: str,
    location: dict,
) -> str:
    """Build a readable cluster title."""
    category = category or "Civic Issue"

    address = location.get("address")
    ward = location.get("ward")

    if address:
        return f"{category} issue near {address}"

    if ward:
        return f"{category} issue in {ward}"

    return f"{category} issue"


async def process_complaint_clustering(
    db,
    *,
    complaint: dict,
) -> dict | None:
    """
    Standalone clustering pipeline.

    This remains available for future use, but complaint creation
    should preferably reuse the similarity results it has already
    calculated.
    """
    location = complaint.get("location") or {}

    lat = location.get("lat")
    lng = location.get("lng")

    description = complaint.get(
        "description",
        "",
    )

    if lat is None or lng is None:
        return None

    if not description.strip():
        return None

    similar_complaints = await find_similar_complaints(
        db,
        description=description,
        lat=float(lat),
        lng=float(lng),
        current_complaint_id=complaint.get("_id"),
        max_results=10,
    )

    if not similar_complaints:
        return None

    return await assign_complaint_to_cluster(
        db,
        complaint=complaint,
        similar_complaints=similar_complaints,
    )


async def serialize_cluster(
    cluster: dict | None,
) -> dict | None:
    """Convert MongoDB cluster data into an API-safe dictionary."""
    if not cluster:
        return None

    result = dict(cluster)

    if "_id" in result:
        result["id"] = str(
            result.pop("_id")
        )

    for key, value in list(result.items()):
        if isinstance(value, ObjectId):
            result[key] = str(value)

    return result