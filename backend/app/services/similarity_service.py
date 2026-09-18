"""
CivicPulse lightweight text similarity and duplicate detection.

This implementation uses deterministic lexical/civic-domain features
with Python's standard library only.

It does NOT use:
- OpenAI
- Gemini
- ChatGPT
- SentenceTransformers
- PyTorch
- external AI APIs

The representation is intentionally lightweight for small deployment
instances such as Render's free tier.
"""

from __future__ import annotations

import hashlib
import math
import re


# -------------------------------------------------------------------
# Similarity thresholds
# -------------------------------------------------------------------

DUPLICATE_SIMILARITY_THRESHOLD = 0.60
RELATED_SIMILARITY_THRESHOLD = 0.50


# -------------------------------------------------------------------
# Geographic thresholds
# -------------------------------------------------------------------

DUPLICATE_RADIUS_METERS = 400
RELATED_RADIUS_METERS = 1000


# -------------------------------------------------------------------
# Vector configuration
# -------------------------------------------------------------------

VECTOR_DIMENSION = 1024

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


# -------------------------------------------------------------------
# Stop words
# -------------------------------------------------------------------

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "at",
    "be",
    "been",
    "by",
    "for",
    "from",
    "has",
    "have",
    "in",
    "is",
    "it",
    "near",
    "of",
    "on",
    "or",
    "that",
    "the",
    "there",
    "this",
    "to",
    "was",
    "were",
    "with",
}


# -------------------------------------------------------------------
# Civic-domain synonym normalization
#
# Different citizens often describe the same issue differently.
# These mappings create shared canonical concepts.
# -------------------------------------------------------------------

CIVIC_SYNONYMS = {
    # ---------------------------------------------------------------
    # Street lights
    # ---------------------------------------------------------------
    "lamp": ("street_light",),
    "lamps": ("street_light",),
    "streetlight": ("street_light",),
    "streetlights": ("street_light",),
    "lights": ("street_light",),

    # ---------------------------------------------------------------
    # Broken / non-working infrastructure
    # ---------------------------------------------------------------
    "broken": ("not_working",),
    "damaged": ("not_working",),
    "failed": ("not_working",),
    "failure": ("not_working",),
    "dead": ("not_working",),
    "malfunctioning": ("not_working",),
    "outage": ("not_working",),

    # ---------------------------------------------------------------
    # Lighting condition
    # ---------------------------------------------------------------
    "dark": ("no_light",),
    "unlit": ("no_light",),

    # ---------------------------------------------------------------
    # Garbage / sanitation
    # ---------------------------------------------------------------
    "garbage": ("waste",),
    "trash": ("waste",),
    "rubbish": ("waste",),
    "dumped": ("waste",),

    # ---------------------------------------------------------------
    # Drainage / flooding
    # ---------------------------------------------------------------
    "drain": ("drainage",),
    "drains": ("drainage",),
    "flooded": ("flooding",),
    "flood": ("flooding",),
    "overflowing": ("overflow",),

    # ---------------------------------------------------------------
    # Water leakage
    # ---------------------------------------------------------------
    "leak": ("leakage",),
    "leaking": ("leakage",),

    # ---------------------------------------------------------------
    # Roads
    # ---------------------------------------------------------------
    "road": ("roadway",),
    "roads": ("roadway",),

    # ---------------------------------------------------------------
    # Traffic signals
    # ---------------------------------------------------------------
    "signal": ("traffic_signal",),
    "signals": ("traffic_signal",),
}


# -------------------------------------------------------------------
# Tokenization
# -------------------------------------------------------------------

def _tokenize(text: str) -> list[str]:
    """
    Convert text into normalized tokens.

    Common grammatical words are removed while civic-specific
    information such as landmarks and numbers is preserved.
    """

    text = (text or "").lower()

    tokens = TOKEN_PATTERN.findall(text)

    return [
        token
        for token in tokens
        if token not in STOP_WORDS
    ]


# -------------------------------------------------------------------
# Deterministic hashing
# -------------------------------------------------------------------

def _hash_index(value: str) -> int:
    """
    Deterministically map a feature to a vector position.

    MD5 is used only as a stable hashing mechanism here. It is NOT
    being used for security or cryptographic authentication.
    """

    digest = hashlib.md5(
        value.encode("utf-8")
    ).digest()

    number = int.from_bytes(
        digest[:8],
        byteorder="big",
    )

    return number % VECTOR_DIMENSION


# -------------------------------------------------------------------
# Feature extraction
# -------------------------------------------------------------------

def _build_features(text: str) -> dict[str, float]:
    """
    Build lightweight weighted civic-language features.

    Feature types:

    w:     ordinary word
    c:     canonical civic concept
    b:     adjacent word pair
    loc:   landmark/location pattern
    """

    tokens = _tokenize(text)

    if not tokens:
        return {}

    features: dict[str, float] = {}

    def add_feature(
        feature: str,
        weight: float,
    ) -> None:
        features[feature] = (
            features.get(feature, 0.0)
            + weight
        )

    # ---------------------------------------------------------------
    # Ordinary words
    #
    # Kept deliberately low-weight because generic wording should
    # not dominate duplicate detection.
    # ---------------------------------------------------------------

    for token in tokens:
        add_feature(
            f"w:{token}",
            0.05,
        )

    # ---------------------------------------------------------------
    # Civic synonym concepts
    # ---------------------------------------------------------------

    for token in tokens:
        concepts = CIVIC_SYNONYMS.get(
            token,
            (),
        )

        for concept in concepts:
            add_feature(
                f"c:{concept}",
                0.35,
            )

    # ---------------------------------------------------------------
    # Multi-word civic concepts
    # ---------------------------------------------------------------

    token_text = " ".join(tokens)

    # Street light / street lamp
    if (
        "street light" in token_text
        or "street lamp" in token_text
        or "street lights" in token_text
    ):
        add_feature(
            "c:street_light",
            0.80,
        )

    # Explicit non-working phrases
    if (
        "not working" in token_text
        or "does not work" in token_text
        or "doesn't work" in token_text
    ):
        add_feature(
            "c:not_working",
            0.15,
        )

    # ---------------------------------------------------------------
    # Adjacent word pairs
    #
    # These preserve some local word order without requiring a
    # neural language model.
    # ---------------------------------------------------------------

    for first, second in zip(
        tokens,
        tokens[1:],
    ):
        add_feature(
            f"b:{first}:{second}",
            0.05,
        )

    # ---------------------------------------------------------------
    # Landmark / location patterns
    #
    # Examples:
    # Gate 3
    # Ward 1
    # Sector 5
    # Block 2
    # Road 4
    #
    # Location is particularly important for civic duplicates.
    # ---------------------------------------------------------------

    location_prefixes = {
        "gate",
        "ward",
        "sector",
        "block",
        "road",
        "street",
    }

    for index in range(len(tokens) - 1):

        first = tokens[index]
        second = tokens[index + 1]

        if (
            first in location_prefixes
            and second.isdigit()
        ):
            add_feature(
                f"loc:{first}:{second}",
                1.20,
            )

    return features


# -------------------------------------------------------------------
# Embedding generation
# -------------------------------------------------------------------

def generate_embedding(
    text: str,
) -> list[float]:
    """
    Generate a deterministic lightweight vector.

    This is NOT a neural embedding.

    It is a fixed-size hashed feature vector designed for:
    - low memory usage
    - deterministic behavior
    - MongoDB storage compatibility
    - duplicate/related civic complaint detection
    """

    features = _build_features(text)

    if not features:
        return []

    vector = [0.0] * VECTOR_DIMENSION

    for feature, weight in features.items():

        index = _hash_index(feature)

        vector[index] += weight

    # ---------------------------------------------------------------
    # L2 normalization
    # ---------------------------------------------------------------

    magnitude = math.sqrt(
        sum(
            value * value
            for value in vector
        )
    )

    if magnitude == 0:
        return []

    return [
        value / magnitude
        for value in vector
    ]


# -------------------------------------------------------------------
# Cosine similarity
# -------------------------------------------------------------------

def cosine_similarity(
    embedding_a: list[float],
    embedding_b: list[float],
) -> float:
    """
    Calculate cosine similarity between two vectors.
    """

    if not embedding_a or not embedding_b:
        return 0.0

    if len(embedding_a) != len(embedding_b):
        return 0.0

    score = sum(
        a * b
        for a, b in zip(
            embedding_a,
            embedding_b,
        )
    )

    return max(
        -1.0,
        min(
            1.0,
            float(score),
        ),
    )


# -------------------------------------------------------------------
# Geographic distance
# -------------------------------------------------------------------

def haversine_m(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    """
    Calculate distance between two coordinates in meters.
    """

    earth_radius = 6_371_000

    p1 = math.radians(lat1)
    p2 = math.radians(lat2)

    dp = math.radians(
        lat2 - lat1
    )

    dl = math.radians(
        lng2 - lng1
    )

    a = (
        math.sin(dp / 2) ** 2
        + math.cos(p1)
        * math.cos(p2)
        * math.sin(dl / 2) ** 2
    )

    return (
        2
        * earth_radius
        * math.asin(
            math.sqrt(a)
        )
    )


# -------------------------------------------------------------------
# Relationship classification
# -------------------------------------------------------------------

def classify_similarity(
    similarity_score: float,
    distance_m: float,
) -> str:
    """
    Classify two complaints as:

    DUPLICATE
    RELATED
    UNRELATED
    """

    # Strong textual match + nearby location
    if (
        similarity_score
        >= DUPLICATE_SIMILARITY_THRESHOLD
        and distance_m
        <= DUPLICATE_RADIUS_METERS
    ):
        return "DUPLICATE"

    # Moderate textual match + broader nearby area
    if (
        similarity_score
        >= RELATED_SIMILARITY_THRESHOLD
        and distance_m
        <= RELATED_RADIUS_METERS
    ):
        return "RELATED"

    return "UNRELATED"


# -------------------------------------------------------------------
# Database similarity search
# -------------------------------------------------------------------

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
    Find similar nearby unresolved complaints.

    Processing order:

    1. Generate lightweight text vector.
    2. Fetch unresolved complaints.
    3. Ignore the current complaint.
    4. Calculate geographic distance.
    5. Ignore complaints beyond RELATED_RADIUS_METERS.
    6. Calculate lightweight text similarity.
    7. Classify relationship.
    8. Return strongest matches.
    """

    new_embedding = generate_embedding(
        description
    )

    if not new_embedding:
        return []

    # ---------------------------------------------------------------
    # Only unresolved complaints are candidates.
    # ---------------------------------------------------------------

    cursor = db.complaints.find(
        {
            "status": {
                "$ne": "Resolved",
            },
        },
        {
            "_id": 1,
            "ticket_id": 1,
            "category": 1,
            "description": 1,
            "location": 1,
            "priority": 1,
        },
    )

    matches = []

    async for complaint in cursor:

        # -----------------------------------------------------------
        # Do not compare with itself.
        # -----------------------------------------------------------

        if (
            current_complaint_id is not None
            and complaint["_id"]
            == current_complaint_id
        ):
            continue

        location = (
            complaint.get("location")
            or {}
        )

        existing_lat = location.get(
            "lat"
        )

        existing_lng = location.get(
            "lng"
        )

        if (
            existing_lat is None
            or existing_lng is None
        ):
            continue

        # -----------------------------------------------------------
        # Geographic filtering first.
        # -----------------------------------------------------------

        distance = haversine_m(
            lat,
            lng,
            float(existing_lat),
            float(existing_lng),
        )

        if (
            distance
            > RELATED_RADIUS_METERS
        ):
            continue

        # -----------------------------------------------------------
        # Generate lightweight vector.
        # -----------------------------------------------------------

        existing_description = (
            complaint.get(
                "description",
                "",
            )
        )

        existing_embedding = (
            generate_embedding(
                existing_description
            )
        )

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
                "ticket_id": complaint.get(
                    "ticket_id"
                ),
                "complaint_id": str(
                    complaint["_id"]
                ),
                "category": complaint.get(
                    "category"
                ),
                "priority": complaint.get(
                    "priority"
                ),
                "similarity_score": round(
                    similarity,
                    3,
                ),
                "distance_m": round(
                    distance,
                    1,
                ),
                "relationship": relationship,
            }
        )

    # ---------------------------------------------------------------
    # Strongest matches first.
    #
    # DUPLICATE comes before RELATED.
    # Then higher similarity.
    # Then closer geographic distance.
    # ---------------------------------------------------------------

    matches.sort(
        key=lambda item: (
            item["relationship"]
            != "DUPLICATE",
            -item["similarity_score"],
            item["distance_m"],
        )
    )

    return matches[:max_results]