from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.models.application import ApplicationStatus


class ApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=160)
    role: str = Field(min_length=1, max_length=160)
    url: HttpUrl | None = None
    status: ApplicationStatus = ApplicationStatus.WISHLIST
    applied_on: date | None = None
    notes: str | None = Field(default=None, max_length=10000)


class ApplicationUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1, max_length=160)
    role: str | None = Field(default=None, min_length=1, max_length=160)
    url: HttpUrl | None = None
    status: ApplicationStatus | None = None
    applied_on: date | None = None
    notes: str | None = Field(default=None, max_length=10000)


class ApplicationResponse(BaseModel):
    id: int
    company: str
    role: str
    url: str | None
    status: ApplicationStatus
    applied_on: date | None
    notes: str | None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
