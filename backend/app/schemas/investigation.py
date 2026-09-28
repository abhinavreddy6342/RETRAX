from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HypothesisCreate(BaseModel):
    """Create a new investigation hypothesis."""

    name: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    confidence: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0 and 1.",
    )

    status: str = Field(
        default="open",
        min_length=1,
        max_length=30,
    )

    supporting_evidence: list[str] = Field(
        default_factory=list,
    )


class HypothesisUpdate(BaseModel):
    """Update an existing hypothesis."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )

    status: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
    )

    supporting_evidence: list[str] | None = None


class HypothesisRead(BaseModel):
    """API representation of a hypothesis."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_id: str
    name: str
    description: str | None = None
    confidence: float
    status: str
    supporting_evidence: list[str] | None = None
    created_at: datetime
    updated_at: datetime


class InvestigationActionCreate(BaseModel):
    """Record an action taken during incident investigation."""

    incident_id: str = Field(
        min_length=1,
        max_length=36,
    )

    runbook_id: str | None = Field(
        default=None,
        max_length=36,
    )

    hypothesis_id: str | None = Field(
        default=None,
        max_length=36,
    )

    action: str = Field(
        min_length=1,
    )

    actor: str | None = Field(
        default=None,
        max_length=150,
    )

    timestamp: datetime

    result: str = Field(
        min_length=1,
        max_length=30,
        description="Outcome of the action, such as success, failure, inconclusive, or blocked.",
    )

    reason: str | None = None

    evidence: list[str] = Field(
        default_factory=list,
    )

    action_metadata: dict | None = None


class InvestigationActionRead(BaseModel):
    """API representation of an investigation action."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_id: str
    runbook_id: str | None = None
    hypothesis_id: str | None = None

    action: str
    actor: str | None = None
    timestamp: datetime
    result: str
    reason: str | None = None

    evidence: list[str] | None = None
    action_metadata: dict | None = None


class InvestigationTimelineItem(BaseModel):
    """Unified timeline entry for an investigation."""

    type: str = Field(
        description="Entry type, such as hypothesis or action.",
    )

    id: str
    timestamp: datetime
    title: str
    description: str | None = None
    status: str | None = None
    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )


class InvestigationSummary(BaseModel):
    """Aggregated investigation state for an incident."""

    incident_id: str

    hypotheses: list[HypothesisRead] = Field(
        default_factory=list,
    )

    actions: list[InvestigationActionRead] = Field(
        default_factory=list,
    )

    timeline: list[InvestigationTimelineItem] = Field(
        default_factory=list,
    )

    active_hypothesis_id: str | None = None

    total_actions: int = 0
    successful_actions: int = 0
    failed_actions: int = 0
class InvestigationActionRequest(BaseModel):
    """Action performed by an engineer during an active investigation."""

    action: str = Field(
        min_length=1,
        description="Investigation or remediation action performed.",
    )

    actor: str | None = Field(
        default=None,
        max_length=150,
    )

    result: str = Field(
        min_length=1,
        max_length=30,
        description="Action outcome such as success, failure, inconclusive, or blocked.",
    )

    reason: str | None = None

    evidence: list[str] = Field(
        default_factory=list,
    )

    runbook_id: str | None = Field(
        default=None,
        max_length=36,
    )

    hypothesis_id: str | None = Field(
        default=None,
        max_length=36,
    )

    timestamp: datetime | None = None