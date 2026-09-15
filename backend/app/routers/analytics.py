from collections import Counter
from datetime import timedelta

from fastapi import APIRouter, Depends

from app.core.database import get_database
from app.core.security import require_roles
from app.models.enums import Status
from app.services.complaint_service import as_utc, now, serialize

router = APIRouter(prefix="/admin", tags=["analytics"])
staff = require_roles("officer", "admin")


def _period_days(period: str) -> int:
    return {"7D": 7, "30D": 30, "90D": 90, "1Y": 365}.get(period, 30)


@router.get("/dashboard/stats")
async def dashboard_stats(db=Depends(get_database), _=Depends(staff)):
    total = await db.complaints.count_documents({})
    new = await db.complaints.count_documents({"status": Status.NEW.value})
    in_progress = await db.complaints.count_documents({"status": Status.IN_PROGRESS.value})
    resolved = await db.complaints.count_documents({"status": Status.RESOLVED.value})
    assigned = await db.complaints.count_documents({"status": Status.ASSIGNED.value})
    critical = await db.complaints.count_documents({"priority": "CRITICAL"})
    overdue = await db.complaints.count_documents(
        {"sla_due_at": {"$lt": now()}, "status": {"$ne": Status.RESOLVED.value}}
    )
    resolution_rate = round((resolved / total) * 100, 1) if total else 0
    return {
        "total": total,
        "new": new,
        "assigned": assigned,
        "in_progress": in_progress,
        "resolved": resolved,
        "critical": critical,
        "overdue": overdue,
        "resolution_rate": resolution_rate,
    }


@router.get("/dashboard/attention")
async def attention_queue(db=Depends(get_database), _=Depends(staff)):
    cursor = (
        db.complaints.find({"status": {"$ne": Status.RESOLVED.value}})
        .sort("priority_score", -1)
        .limit(8)
    )
    return {"items": [serialize(c) async for c in cursor]}


@router.get("/analytics/summary")
async def summary(period: str = "30D", db=Depends(get_database), _=Depends(staff)):
    since = now() - timedelta(days=_period_days(period))
    total = await db.complaints.count_documents({"created_at": {"$gte": since}})
    resolved = await db.complaints.count_documents(
        {"created_at": {"$gte": since}, "status": Status.RESOLVED.value}
    )
    durations = []
    async for c in db.complaints.find(
        {"status": Status.RESOLVED.value, "resolved_at": {"$ne": None}},
        {"created_at": 1, "resolved_at": 1},
    ):
        r, cr = as_utc(c.get("resolved_at")), as_utc(c.get("created_at"))
        if r and cr:
            durations.append((r - cr).total_seconds() / 3600)
    avg_res = round(sum(durations) / len(durations), 1) if durations else 0
    return {
        "period": period,
        "received": total,
        "resolved": resolved,
        "resolution_rate": round((resolved / total) * 100, 1) if total else 0,
        "avg_resolution_hours": avg_res,
    }


@router.get("/analytics/distribution")
async def distribution(db=Depends(get_database), _=Depends(staff)):
    by_category: Counter = Counter()
    by_priority: Counter = Counter()
    by_status: Counter = Counter()
    async for c in db.complaints.find({}, {"category": 1, "priority": 1, "status": 1}):
        by_category[c.get("category", "Other")] += 1
        by_priority[c.get("priority", "LOW")] += 1
        by_status[c.get("status", "New")] += 1
    return {
        "by_category": dict(by_category),
        "by_priority": dict(by_priority),
        "by_status": dict(by_status),
    }


@router.get("/analytics/aging")
async def aging(db=Depends(get_database), _=Depends(staff)):
    buckets = {"0-1d": 0, "1-3d": 0, "3-7d": 0, "7d+": 0}
    n = now()
    async for c in db.complaints.find(
        {"status": {"$ne": Status.RESOLVED.value}}, {"created_at": 1}
    ):
        hours = (n - as_utc(c["created_at"])).total_seconds() / 3600
        if hours <= 24:
            buckets["0-1d"] += 1
        elif hours <= 72:
            buckets["1-3d"] += 1
        elif hours <= 168:
            buckets["3-7d"] += 1
        else:
            buckets["7d+"] += 1
    return {"buckets": buckets}


@router.get("/analytics/trajectory")
async def trajectory(period: str = "30D", db=Depends(get_database), _=Depends(staff)):
    days = _period_days(period)
    since = now() - timedelta(days=days)
    received = Counter()
    resolved = Counter()
    async for c in db.complaints.find(
        {"created_at": {"$gte": since}}, {"created_at": 1, "resolved_at": 1}
    ):
        received[as_utc(c["created_at"]).date().isoformat()] += 1
        if c.get("resolved_at"):
            resolved[as_utc(c["resolved_at"]).date().isoformat()] += 1
    series = []
    for i in range(days):
        day = (since + timedelta(days=i)).date().isoformat()
        series.append({"date": day, "received": received.get(day, 0), "resolved": resolved.get(day, 0)})
    return {"series": series}


@router.get("/analytics/sla")
async def sla(db=Depends(get_database), _=Depends(staff)):
    n = now()
    on_time = 0
    breached = 0
    async for c in db.complaints.find(
        {"sla_due_at": {"$ne": None}}, {"sla_due_at": 1, "status": 1, "resolved_at": 1}
    ):
        due = as_utc(c["sla_due_at"])
        if c["status"] == Status.RESOLVED.value:
            r = as_utc(c.get("resolved_at"))
            if r and r <= due:
                on_time += 1
            else:
                breached += 1
        else:
            if n <= due:
                on_time += 1
            else:
                breached += 1
    total = on_time + breached
    return {
        "on_time": on_time,
        "breached": breached,
        "compliance": round((on_time / total) * 100, 1) if total else 100,
    }


@router.get("/analytics/departments")
async def departments(db=Depends(get_database), _=Depends(staff)):
    stats: dict[str, dict] = {}
    async for c in db.complaints.find({}, {"department": 1, "status": 1}):
        dept = c.get("department", "General Services")
        s = stats.setdefault(dept, {"total": 0, "resolved": 0, "open": 0})
        s["total"] += 1
        if c["status"] == Status.RESOLVED.value:
            s["resolved"] += 1
        else:
            s["open"] += 1
    return {"departments": [{"name": k, **v} for k, v in stats.items()]}


@router.get("/analytics/insights")
async def insights(db=Depends(get_database), _=Depends(staff)):
    result: list[str] = []
    by_cat: Counter = Counter()
    async for c in db.complaints.find({"status": {"$ne": Status.RESOLVED.value}}, {"category": 1}):
        by_cat[c.get("category", "Other")] += 1
    if by_cat:
        top, count = by_cat.most_common(1)[0]
        result.append(f"{top} is the most reported open issue ({count} active).")
    overdue = await db.complaints.count_documents(
        {"sla_due_at": {"$lt": now()}, "status": {"$ne": Status.RESOLVED.value}}
    )
    if overdue:
        result.append(f"{overdue} complaint(s) have breached their SLA target.")
    critical = await db.complaints.count_documents(
        {"priority": "CRITICAL", "status": {"$ne": Status.RESOLVED.value}}
    )
    if critical:
        result.append(f"{critical} critical complaint(s) need immediate attention.")
    if not result:
        result.append("All complaints are within SLA. Nothing needs urgent attention.")
    return {"insights": result}
