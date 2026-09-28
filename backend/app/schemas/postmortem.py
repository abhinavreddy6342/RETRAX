from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TimelineEntry(BaseModel):
    """A single event in an incident postmortem timeline."""

    timestamp: datetime

    event: str = Field(
        min_length=1,
        max_length=250,
    )

    description: str | None = None

    actor: str | None = Field(
        default=None,
        max_length=150,
    )


class PostmortemBase(BaseModel):
    """Shared postmortem fields."""

    summary: str = Field(
        min_length=1,
    )

    impact: str | None = None

    timeline: list[TimelineEntry] = Field(
        default_factory=list,
    )

    root_cause: str | None = None

    contributing_factors: list[str] = Field(
        default_factory=list,
    )

    successful_actions: list[str] = Field(
        default_factory=list,
    )

    failed_actions: list[str] = Field(
        default_factory=list,
    )

    preventive_actions: list[str] = Field(
        default_factory=list,
    )

    lessons_learned: list[str] = Field(
        default_factory=list,
    )


class PostmortemCreate(PostmortemBase):
    """Create a postmortem for an incident."""

    incident_id: str = Field(
        min_length=1,
        max_length=36,
    )


class PostmortemUpdate(BaseModel):
    """Update an incident postmortem."""

    model_config = ConfigDict(extra="forbid")

    summary: str | None = Field(
        default=None,
        min_length=1,
    )

    impact: str | None = None

    timeline: list[TimelineEntry] | None = None

    root_cause: str | None = None

    contributing_factors: list[str] | None = None

    successful_actions: list[str] | None = None

    failed_actions: list[str] | None = None

    preventive_actions: list[str] | None = None

    lessons_learned: list[str] | None = None


class PostmortemRead(PostmortemBase):
    """Postmortem returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_id: str
    created_at: datetime


class PostmortemLearning(BaseModel):
    """Durable learning extracted from a postmortem."""

    incident_id: str

    root_cause: str | None = None

    successful_patterns: list[str] = Field(
        default_factory=list,
    )

    failed_patterns: list[str] = Field(
        default_factory=list,
    )

    lessons: list[str] = Field(
        default_factory=list,
    )

    preventive_actions: list[str] = Field(
        default_factory=list,
    )

    recurring_pattern: str | None = None

    knowledge_gaps: list[str] = Field(
        default_factory=list,
    )

    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )