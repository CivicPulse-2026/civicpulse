"""Public, unauthenticated endpoints for the marketing/landing page."""

from fastapi import APIRouter, Depends

from app.core.database import get_database
from app.models.enums import Status
from app.services.complaint_service import as_utc, now

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/stats")
async def public_stats(db=Depends(get_database)):
    """Aggregate, non-sensitive metrics for the public trust bar.

    Numbers are computed live from the complaints collection so the landing
    page always reflects real activity instead of hard-coded figures.
    """
    total = await db.complaints.count_documents({})
    resolved = await db.complaints.count_documents({"status": Status.RESOLVED.value})
    active = await db.complaints.count_documents(
        {"status": {"$ne": Status.RESOLVED.value}}
    )

    # Average resolution time (hours) across resolved complaints.
    durations = []
    async for c in db.complaints.find(
        {"status": Status.RESOLVED.value, "resolved_at": {"$ne": None}},
        {"created_at": 1, "resolved_at": 1},
    ):
        r, cr = as_utc(c.get("resolved_at")), as_utc(c.get("created_at"))
        if r and cr:
            durations.append((r - cr).total_seconds() / 3600)
    avg_resolution_hours = round(sum(durations) / len(durations), 1) if durations else 0

    # SLA compliance: resolved-on-time + still-within-window over everything with a due date.
    n = now()
    on_time = 0
    breached = 0
    async for c in db.complaints.find(
        {"sla_due_at": {"$ne": None}},
        {"sla_due_at": 1, "status": 1, "resolved_at": 1},
    ):
        due = as_utc(c["sla_due_at"])
        if c.get("status") == Status.RESOLVED.value:
            rr = as_utc(c.get("resolved_at"))
            met = rr is not None and rr <= due
        else:
            met = n <= due
        if met:
            on_time += 1
        else:
            breached += 1
    sla_total = on_time + breached
    sla_compliance = round((on_time / sla_total) * 100, 1) if sla_total else 100.0

    resolution_rate = round((resolved / total) * 100, 1) if total else 0.0

    # Distinct cities represented (from registered users) — a "communities served" number.
    cities = await db.users.distinct("city")
    communities = len([c for c in cities if c])

    return {
        "total_reported": total,
        "resolved": resolved,
        "active": active,
        "resolution_rate": resolution_rate,
        "sla_compliance": sla_compliance,
        "avg_resolution_hours": avg_resolution_hours,
        "communities": communities,
    }
