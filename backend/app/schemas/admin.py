from pydantic import BaseModel, Field


class StatusUpdate(BaseModel):
    status: str
    note: str | None = None


class AssignRequest(BaseModel):
    assigned_to: str
    note: str | None = None


class DispatchRequest(BaseModel):
    crew: str
    eta_hours: int | None = None
    note: str | None = None


class EscalateRequest(BaseModel):
    reason: str
    level: str | None = "HIGH"


class NotifyRequest(BaseModel):
    channel: str = "email"
    message: str


class NoteCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    type: str = "internal"


class BulkAssignRequest(BaseModel):
    complaint_ids: list[str]
    assigned_to: str
