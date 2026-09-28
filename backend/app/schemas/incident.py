from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class IncidentBase(BaseModel):
    """Shared incident fields."""

    incident_key: str = Field(
        min_length=1,
        max_length=50,
        description="Unique incident identifier such as INC-2026-001",
    )

    title: str = Field(
        min_length=1,
        max_length=250,
    )

    description: str = Field(
        min_length=1,
    )

    severity: str = Field(
        min_length=1,
        max_length=20,
        description="Incident severity such as SEV-1, SEV-2, SEV-3, or SEV-4",
    )

    status: str = Field(
        min_length=1,
        max_length=30,
        description="Current incident lifecycle status",
    )

    environment: str = Field(
        min_length=1,
        max_length=30,
        description="Affected environment such as production or staging",
    )

    current_error: str | None = None
    impact: str | None = None

    started_at: datetime
    detected_at: datetime


class IncidentCreate(IncidentBase):
    """Payload used to create an incident."""

    organization_id: str = Field(
        min_length=1,
        max_length=36,
    )

    service_id: str = Field(
        min_length=1,
        max_length=36,
    )

    assigned_to: str | None = Field(
        default=None,
        max_length=36,
    )

    deployment_id: str | None = Field(
        default=None,
        max_length=36,
    )


class IncidentUpdate(BaseModel):
    """Payload used to update an existing incident."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=250,
    )

    description: str | None = Field(
        default=None,
        min_length=1,
    )

    severity: str | None = Field(
        default=None,
        min_length=1,
        max_length=20,
    )

    status: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
    )

    environment: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
    )

    assigned_to: str | None = Field(
        default=None,
        max_length=36,
    )

    deployment_id: str | None = Field(
        default=None,
        max_length=36,
    )

    current_error: str | None = None
    impact: str | None = None
    root_cause: str | None = None
    resolution_summary: str | None = None

    started_at: datetime | None = None
    detected_at: datetime | None = None
    resolved_at: datetime | None = None


class IncidentRead(IncidentBase):
    """API response returned for an incident."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    service_id: str

    assigned_to: str | None = None
    deployment_id: str | None = None

    root_cause: str | None = None
    resolution_summary: str | None = None

    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class IncidentListItem(BaseModel):
    """Compact incident representation for dashboards and lists."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_key: str
    title: str
    severity: str
    status: str
    environment: str
    service_id: str

    started_at: datetime
    detected_at: datetime
    resolved_at: datetime | None = None


class IncidentListResponse(BaseModel):
    """Paginated incident list response."""

    items: list[IncidentListItem]
    total: int