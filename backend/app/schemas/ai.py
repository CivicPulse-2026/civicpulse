from typing import Literal

from pydantic import BaseModel, Field


CategoryLiteral = Literal[
    "Pothole",
    "Street Light",
    "Garbage / Sanitation",
    "Water / Drainage",
    "Noise",
    "Graffiti",
    "Traffic Signal",
    "Parks / Trees",
    "Other",
]


class ComplaintAIAnalysis(BaseModel):
    category: CategoryLiteral

    issue: str

    location: str | None = None

    duration_days: int | None = Field(
        default=None,
        ge=0,
    )

    urgency: Literal[
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    ]

    summary: str

    keywords: list[str] = Field(
        default_factory=list,
    )

    confidence: float = Field(
        ge=0.0,
        le=1.0,
    )