"""
CivicPulse local AI complaint analyzer.

Primary path:
    Complaint text -> Ollama local LLM -> structured JSON -> Pydantic validation

Fallback path:
    Complaint text -> deterministic keyword classifier

The AI is responsible for understanding the complaint.
It does NOT make the final operational priority decision.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.models.enums import Category
from app.schemas.ai import ComplaintAIAnalysis


logger = logging.getLogger(__name__)


OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"


# ---------------------------------------------------------------------------
# Existing deterministic classifier
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS = [
    (
        Category.POTHOLE.value,
        ["pothole", "road", "crack", "asphalt", "pavement", "crater"],
    ),
    (
        Category.STREETLIGHT.value,
        [
            "street light",
            "streetlight",
            "lamp",
            "light out",
            "dark street",
            "bulb",
        ],
    ),
    (
        Category.GARBAGE.value,
        [
            "garbage",
            "trash",
            "litter",
            "dump",
            "waste",
            "sanitation",
            "bin",
            "rubbish",
        ],
    ),
    (
        Category.WATER.value,
        [
            "water",
            "drain",
            "drainage",
            "flood",
            "leak",
            "sewage",
            "pipe",
            "overflow",
        ],
    ),
    (
        Category.TRAFFIC.value,
        [
            "traffic",
            "signal",
            "light not working",
            "crossing",
            "sign",
        ],
    ),
    (
        Category.GRAFFITI.value,
        [
            "graffiti",
            "vandal",
            "spray paint",
            "tagging",
        ],
    ),
    (
        Category.NOISE.value,
        [
            "noise",
            "loud",
            "music",
            "party",
            "disturbance",
        ],
    ),
    (
        Category.PARKS.value,
        [
            "tree",
            "park",
            "branch",
            "playground",
            "bench",
            "grass",
        ],
    ),
]


def suggest_category(description: str) -> str:
    """
    Deterministic fallback category classifier.

    This is intentionally kept even after introducing the local LLM.
    If the local model is unavailable, complaint analysis can still continue.
    """
    text = (description or "").lower()

    best = Category.OTHER.value
    best_hits = 0

    for category, words in CATEGORY_KEYWORDS:
        hits = sum(1 for word in words if word in text)

        if hits > best_hits:
            best = category
            best_hits = hits

    return best


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def _allowed_categories() -> list[str]:
    """Return the application's actual category values."""
    return [category.value for category in Category]


def _build_prompt(description: str) -> str:
    categories = _allowed_categories()

    return f"""
You are the local AI complaint understanding engine for CivicPulse,
a civic complaint management platform.

Analyze the citizen complaint below.

Your job is ONLY to understand and structure the complaint.

You must NOT make the final operational priority decision.
Do not determine SLA.
Do not determine assignment.
Do not invent facts.

Return ONLY valid JSON.

The JSON must contain exactly these fields:

{{
  "category": "string",
  "issue": "string",
  "location": "string or null",
  "duration_days": "integer or null",
  "urgency": "LOW | MEDIUM | HIGH | CRITICAL",
  "summary": "string",
  "keywords": ["string"],
  "confidence": 0.0
}}

Allowed categories:

{", ".join(categories)}

IMPORTANT:
The "category" field MUST exactly match one of the allowed categories.
Do not create a new category.
Do not abbreviate a category.
Do not change capitalization.

Rules:

1. Select the most appropriate category from the allowed categories.
2. Describe the actual civic issue in one concise sentence.
3. Extract a location if the citizen mentions one.
4. Convert stated durations into approximate days.
5. If no duration is stated, use null.
6. Urgency describes the apparent urgency in the citizen's description.
7. Do not calculate CivicPulse's final priority.
8. Do not invent a location, duration, category detail, or event.
9. summary must be concise and factual.
10. keywords should contain important words or phrases from the complaint.
11. confidence must be a number between 0 and 1.
12. Return JSON only. No markdown. No explanation.

Citizen complaint:

{description}
""".strip()


# ---------------------------------------------------------------------------
# JSON parsing
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> dict[str, Any]:
    """
    Extract a JSON object from the model response.

    Handles both clean JSON and responses where the model accidentally
    surrounds JSON with extra text or markdown.
    """
    text = text.strip()

    # First try the complete response.
    try:
        value = json.loads(text)

        if isinstance(value, dict):
            return value

    except json.JSONDecodeError:
        pass

    # Try extracting the first JSON object.
    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in Ollama response.")

    value = json.loads(text[start : end + 1])

    if not isinstance(value, dict):
        raise ValueError("Ollama response is not a JSON object.")

    return value


# ---------------------------------------------------------------------------
# Category normalization
# ---------------------------------------------------------------------------

def _normalize_category(category: str, description: str) -> str:
    """
    Ensure the LLM category belongs to CivicPulse's actual taxonomy.

    If the model returns an unknown category, use the deterministic
    classifier as a safe fallback.
    """
    allowed = set(_allowed_categories())

    if category in allowed:
        return category

    return suggest_category(description)


# ---------------------------------------------------------------------------
# Local LLM call
# ---------------------------------------------------------------------------

async def _call_ollama(description: str) -> ComplaintAIAnalysis:
    prompt = _build_prompt(description)

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0,
        },
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            OLLAMA_URL,
            json=payload,
        )

    response.raise_for_status()

    data = response.json()

    raw_response = data.get("response")

    if not raw_response:
        raise ValueError("Ollama returned an empty response.")

    parsed = _extract_json(raw_response)

    parsed["category"] = _normalize_category(
        parsed.get("category", ""),
        description,
    )

    return ComplaintAIAnalysis.model_validate(parsed)


# ---------------------------------------------------------------------------
# Public AI interface
# ---------------------------------------------------------------------------

async def analyze_complaint(description: str) -> ComplaintAIAnalysis:
    """
    Analyze a complaint using the local LLM.

    If Ollama or validation fails, use the deterministic fallback so
    complaint submission does not fail just because AI is unavailable.
    """
    description = (description or "").strip()

    if not description:
        raise ValueError("Complaint description cannot be empty.")

    try:
        return await _call_ollama(description)

    except Exception as exc:
        logger.warning(
            "Local AI analysis failed; using rule-based fallback: %s",
            exc,
        )

        category = suggest_category(description)

        return ComplaintAIAnalysis(
            category=category,
            issue=description[:200],
            location=None,
            duration_days=None,
            urgency="MEDIUM",
            summary=description[:500],
            keywords=[],
            confidence=0.0,
        )