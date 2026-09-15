"""Dependency-free, rule-based description classifier.

Suggests a category from free-text keywords so citizens get an auto-filled
category, and admins get a consistent taxonomy. Purely deterministic.
"""

from __future__ import annotations

from app.models.enums import Category

CATEGORY_KEYWORDS = [
    (Category.POTHOLE.value, ["pothole", "road", "crack", "asphalt", "pavement", "crater"]),
    (Category.STREETLIGHT.value, ["street light", "streetlight", "lamp", "light out", "dark street", "bulb"]),
    (Category.GARBAGE.value, ["garbage", "trash", "litter", "dump", "waste", "sanitation", "bin", "rubbish"]),
    (Category.WATER.value, ["water", "drain", "drainage", "flood", "leak", "sewage", "pipe", "overflow"]),
    (Category.TRAFFIC.value, ["traffic", "signal", "light not working", "crossing", "sign"]),
    (Category.GRAFFITI.value, ["graffiti", "vandal", "spray paint", "tagging"]),
    (Category.NOISE.value, ["noise", "loud", "music", "party", "disturbance"]),
    (Category.PARKS.value, ["tree", "park", "branch", "playground", "bench", "grass"]),
]


def suggest_category(description: str) -> str:
    text = (description or "").lower()
    best, best_hits = Category.OTHER.value, 0
    for category, words in CATEGORY_KEYWORDS:
        hits = sum(1 for w in words if w in text)
        if hits > best_hits:
            best, best_hits = category, hits
    return best
