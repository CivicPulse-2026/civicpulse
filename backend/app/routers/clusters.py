"""
CivicPulse cluster API routes.

Provides read-only access to complaint clusters for:
- Admin dashboard
- Civic Intelligence Map
- Analytics
- Future supervisor workflows
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.database import get_database
from app.services.cluster_service import serialize_cluster


router = APIRouter(
    prefix="/clusters",
    tags=["clusters"],
)


@router.get("")
async def list_clusters(
    status: str | None = Query(
        default=None,
        description="Filter by cluster status, e.g. OPEN or CLOSED.",
    ),
    category: str | None = Query(
        default=None,
        description="Filter by complaint category.",
    ),
    ward: str | None = Query(
        default=None,
        description="Filter by ward.",
    ),
    db=Depends(get_database),
):
    """
    Return complaint clusters.

    Supports optional filtering by:
    - status
    - category
    - ward

    Newest clusters are returned first.
    """

    query: dict = {}

    if status:
        query["status"] = status

    if category:
        query["category"] = category

    if ward:
        query["location.ward"] = ward

    cursor = (
        db.complaint_clusters
        .find(query)
        .sort("updated_at", -1)
    )

    clusters = []

    async for cluster in cursor:
        clusters.append(
            await serialize_cluster(cluster)
        )

    return {
        "clusters": clusters,
        "total": len(clusters),
    }


@router.get("/{cluster_id}")
async def get_cluster(
    cluster_id: str,
    db=Depends(get_database),
):
    """
    Return a single cluster with its associated complaints.
    """

    cluster = await db.complaint_clusters.find_one(
        {
            "cluster_id": cluster_id
        }
    )

    if not cluster:
        raise HTTPException(
            status_code=404,
            detail="Cluster not found.",
        )

    cluster = await serialize_cluster(cluster)

    # ---------------------------------------------------------
    # Fetch all complaints belonging to the cluster
    # ---------------------------------------------------------

    complaint_ids = cluster.get(
        "complaint_ids",
        [],
    )

    complaints = []

    if complaint_ids:
        cursor = (
            db.complaints
            .find(
                {
                    "ticket_id": {
                        "$in": complaint_ids
                    }
                }
            )
            .sort("created_at", 1)
        )

        async for complaint in cursor:
            # Do not expose the embedding.
            complaint.pop("embedding", None)

            # Convert MongoDB ObjectId.
            if "_id" in complaint:
                complaint["id"] = str(
                    complaint.pop("_id")
                )

            complaints.append(complaint)

    cluster["complaints"] = complaints

    return {
        "cluster": cluster
    }