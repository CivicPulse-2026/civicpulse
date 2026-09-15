"""Rule-based complaint prioritization.

The score (0-100) is computed from three signals required by the case study:

    1. Issue category     -> a base severity weight per category.
    2. Complaint age       -> older, still-open complaints gain urgency over time.
    3. Similar complaints  -> more reports of the same issue nearby raise priority.

A small safety-keyword bonus is layered on top so that descriptions mentioning
hazards (gas leak, exposed wire, flooding, accident...) are escalated.

The final score maps to a discrete priority band, and each band carries an
SLA target measured in hours.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.models.enums import Category, Priority

# Base severity by category (0-45). Life-safety categories score higher.
CATEGORY_WEIGHT = {
    Category.WATER.value: 40,
    Category.TRAFFIC.value: 42,
    Category.POTHOLE.value: 30,
    Category.STREETLIGHT.value: 28,
    Category.GARBAGE.value: 22,
    Category.GRAFFITI.value: 12,
    Category.NOISE.value: 15,
    Category.PARKS.value: 18,
    Category.OTHER.value: 20,
}

SAFETY_KEYWORDS = {
    "gas": 18, "leak": 12, "fire": 20, "spark": 14, "electric": 12,
    "exposed": 12, "wire": 10, "flood": 14, "flooding": 14, "accident": 16,
    "injury": 16, "injured": 16, "collapse": 18, "collapsed": 18,
    "sinkhole": 18, "danger": 12, "dangerous": 12, "hazard": 12,
    "emergency": 16, "blocked": 8, "overflow": 10, "sewage": 12,
    "downed": 12, "dark": 6, "child": 10, "school": 8,
}

PRIORITY_BANDS = [
    (80, Priority.CRITICAL.value, 4),
    (60, Priority.HIGH.value, 24),
    (35, Priority.MEDIUM.value, 72),
    (0, Priority.LOW.value, 120),
]


def _age_bonus(created_at: datetime | None) -> int:
    if created_at is None:
        return 0
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    hours = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600
    return int(min(20, hours / 6))


def _similar_bonus(similar_count: int) -> int:
    return int(min(20, max(0, similar_count) * 4))


def _keyword_bonus(text: str) -> tuple[int, list[str]]:
    text_l = (text or "").lower()
    total = 0
    hits: list[str] = []
    for word, weight in SAFETY_KEYWORDS.items():
        if word in text_l:
            total += weight
            hits.append(word)
    return min(25, total), hits


def band_for_score(score: int) -> tuple[str, int]:
    for threshold, priority, sla in PRIORITY_BANDS:
        if score >= threshold:
            return priority, sla
    return Priority.LOW.value, 120


def score_complaint(
    *,
    category: str,
    description: str,
    created_at: datetime | None = None,
    similar_count: int = 0,
) -> dict:
    category_score = CATEGORY_WEIGHT.get(category, CATEGORY_WEIGHT[Category.OTHER.value])
    age_score = _age_bonus(created_at)
    similar_score = _similar_bonus(similar_count)
    keyword_score, keywords = _keyword_bonus(description)

    total = min(100, category_score + age_score + similar_score + keyword_score)
    priority, sla_hours = band_for_score(total)

    return {
        "score": total,
        "priority": priority,
        "sla_hours": sla_hours,
        "keywords": keywords,
        "factors": {
            "category_weight": category_score,
            "age_bonus": age_score,
            "similar_bonus": similar_score,
            "safety_keyword_bonus": keyword_score,
            "similar_count": similar_count,
        },
    }
