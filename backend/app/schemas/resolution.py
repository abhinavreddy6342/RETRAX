from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ResolutionBase(BaseModel):
    """Shared resolution fields."""

    root_cause: str = Field(
        min_length=1,
        description="Confirmed or validated root cause of the incident.",
    )

    resolution: str = Field(
        min_length=1,
        description="How the incident was resolved.",
    )

    outcome: str = Field(
        min_length=1,
        max_length=30,
        description="Final resolution outcome, such as resolved, partially_resolved, or unresolved.",
    )

    successful_actions: list[str] = Field(
        default_factory=list,
        description="Investigation or remediation actions that produced useful results.",
    )

    failed_actions: list[str] = Field(
        default_factory=list,
        description="Actions that were attempted but did not resolve or materially help the incident.",
    )

    resolved_by: str | None = Field(
        default=None,
        max_length=150,
    )

    resolved_at: datetime


class ResolutionCreate(ResolutionBase):
    """Create the final resolution record for an incident."""

    incident_id: str = Field(
        min_length=1,
        max_length=36,
    )


class ResolutionUpdate(BaseModel):
    """Update a resolution before it is finalized."""

    model_config = ConfigDict(extra="forbid")

    root_cause: str | None = Field(
        default=None,
        min_length=1,
    )

    resolution: str | None = Field(
        default=None,
        min_length=1,
    )

    outcome: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
    )

    successful_actions: list[str] | None = None

    failed_actions: list[str] | None = None

    resolved_by: str | None = Field(
        default=None,
        max_length=150,
    )

    resolved_at: datetime | None = None


class ResolutionRead(ResolutionBase):
    """Resolution returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_id: str


class ResolutionLearning(BaseModel):
    """Learning extracted from a completed incident resolution."""

    incident_id: str

    root_cause: str

    resolution: str

    successful_actions: list[str] = Field(
        default_factory=list,
    )

    failed_actions: list[str] = Field(
        default_factory=list,
    )

    lessons: list[str] = Field(
        default_factory=list,
    )

    preventive_actions: list[str] = Field(
        default_factory=list,
    )

    repeat_warning: str | None = Field(
        default=None,
        description="Warning about actions or conditions that should not be repeated.",
    )

    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )