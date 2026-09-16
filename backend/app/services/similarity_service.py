"""
CivicPulse semantic similarity and duplicate detection.

Uses a local SentenceTransformer model.
No OpenAI, Gemini, or external AI API is used.
"""

from __future__ import annotations

import math
from functools import lru_cache

from sentence_transformers import SentenceTransformer


MODEL_NAME = "all-MiniLM-L6-v2"

# Similarity thresholds
DUPLICATE_SIMILARITY_THRESHOLD = 0.60
RELATED_SIMILARITY_THRESHOLD = 0.50

# Geographic thresholds
DUPLICATE_RADIUS_METERS = 400
RELATED_RADIUS_METERS = 1000


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """Load the embedding model once and reuse it."""
    return SentenceTransformer(MODEL_NAME)


def generate_embedding(text: str) -> list[float]:
    """Convert complaint text into a normalized embedding vector."""
    text = (text or "").strip()

    if not text:
        return []

    model = get_embedding_model()

    embedding = model.encode(
        text,
        normalize_embeddings=True,
    )

    return embedding.tolist()


def cosine_similarity(
    embedding_a: list[float],
    embedding_b: list[float],
) -> float:
    """Calculate cosine similarity between two normalized vectors."""

    if not embedding_a or not embedding_b:
        return 0.0

    if len(embedding_a) != len(embedding_b):
        return 0.0

    score = sum(
        a * b
        for a, b in zip(embedding_a, embedding_b)
    )

    return max(-1.0, min(1.0, float(score)))


def haversine_m(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    """Calculate distance between two coordinates in meters."""

    earth_radius = 6_371_000

    p1 = math.radians(lat1)
    p2 = math.radians(lat2)

    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)

    a = (
        math.sin(dp / 2) ** 2
        + math.cos(p1)
        * math.cos(p2)
        * math.sin(dl / 2) ** 2
    )

    return 2 * earth_radius * math.asin(math.sqrt(a))


def classify_similarity(
    similarity_score: float,
    distance_m: float,
) -> str:
    """Classify the relationship between two complaints."""

    if (
        similarity_score >= DUPLICATE_SIMILARITY_THRESHOLD
        and distance_m <= DUPLICATE_RADIUS_METERS
    ):
        return "DUPLICATE"

    if (
        similarity_score >= RELATED_SIMILARITY_THRESHOLD
        and distance_m <= RELATED_RADIUS_METERS
    ):
        return "RELATED"

    return "UNRELATED"


async def find_similar_complaints(
    db,
    *,
    description: str,
    lat: float,
    lng: float,
    current_complaint_id=None,
    max_results: int = 5,
) -> list[dict]:
    """
    Find semantically similar nearby complaints.

    For the hackathon-scale dataset we intentionally perform
    cosine similarity in Python instead of requiring MongoDB
    Atlas Vector Search.
    """

    new_embedding = generate_embedding(description)

    if not new_embedding:
        return []

    # Only unresolved complaints are candidates.
    cursor = db.complaints.find(
        {
            "status": {"$ne": "Resolved"},
            "embedding": {"$exists": True},
        },
        {
            "_id": 1,
            "ticket_id": 1,
            "category": 1,
            "description": 1,
            "location": 1,
            "priority": 1,
            "embedding": 1,
        },
    )

    matches = []

    async for complaint in cursor:

        # Never compare a complaint with itself.
        if (
            current_complaint_id is not None
            and complaint["_id"] == current_complaint_id
        ):
            continue

        location = complaint.get("location") or {}

        existing_lat = location.get("lat")
        existing_lng = location.get("lng")

        if existing_lat is None or existing_lng is None:
            continue

        distance = haversine_m(
            lat,
            lng,
            existing_lat,
            existing_lng,
        )

        # No need to calculate embeddings for distant complaints.
        if distance > RELATED_RADIUS_METERS:
            continue

        existing_embedding = complaint.get("embedding") or []

        similarity = cosine_similarity(
            new_embedding,
            existing_embedding,
        )

        relationship = classify_similarity(
            similarity,
            distance,
        )

        if relationship == "UNRELATED":
            continue

        matches.append(
            {
                "ticket_id": complaint.get("ticket_id"),
                "complaint_id": str(complaint["_id"]),
                "category": complaint.get("category"),
                "priority": complaint.get("priority"),
                "similarity_score": round(similarity, 3),
                "distance_m": round(distance, 1),
                "relationship": relationship,
            }
        )

    # Strongest semantic matches first.
    matches.sort(
        key=lambda item: (
            item["relationship"] != "DUPLICATE",
            -item["similarity_score"],
            item["distance_m"],
        )
    )

    return matches[:max_results]