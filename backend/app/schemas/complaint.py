from datetime import datetime

from pydantic import BaseModel, Field


class Location(BaseModel):
    lat: float
    lng: float
    address: str | None = None
    ward: str | None = None


class ComplaintCreate(BaseModel):
    category: str
    description: str = Field(min_length=5, max_length=2000)
    lat: float
    lng: float
    address: str | None = None
    ward: str | None = None
    reporter_name: str | None = None
    reporter_contact: str | None = None


class AnalyzeRequest(BaseModel):
    description: str


class AnalyzeResponse(BaseModel):
    suggested_category: str
    priority: str
    priority_score: int
    sla_hours: int
    keywords: list[str]
    factors: dict
