from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RunbookStep(BaseModel):
    """A single executable or investigative runbook step."""

    order: int = Field(
        ge=1,
    )

    title: str = Field(
        min_length=1,
        max_length=200,
    )

    instruction: str = Field(
        min_length=1,
    )

    expected_result: str | None = None

    command: str | None = None

    risk_level: str = Field(
        default="low",
        max_length=20,
    )


class RunbookBase(BaseModel):
    """Shared runbook fields."""

    runbook_key: str = Field(
        min_length=1,
        max_length=100,
    )

    name: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    steps: list[RunbookStep] = Field(
        default_factory=list,
    )

    risk_level: str = Field(
        default="low",
        min_length=1,
        max_length=20,
    )

    service_id: str | None = Field(
        default=None,
        max_length=36,
    )


class RunbookCreate(RunbookBase):
    """Create a new runbook."""

    organization_id: str = Field(
        min_length=1,
        max_length=36,
    )


class RunbookUpdate(BaseModel):
    """Update an existing runbook."""

    model_config = ConfigDict(extra="forbid")

    runbook_key: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    steps: list[RunbookStep] | None = None

    risk_level: str | None = Field(
        default=None,
        min_length=1,
        max_length=20,
    )

    service_id: str | None = Field(
        default=None,
        max_length=36,
    )


class RunbookRead(RunbookBase):
    """Runbook returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime


class RunbookExecutionRequest(BaseModel):
    """Request to execute or evaluate a runbook during an investigation."""

    incident_id: str = Field(
        min_length=1,
        max_length=36,
    )

    runbook_id: str = Field(
        min_length=1,
        max_length=36,
    )

    actor: str | None = Field(
        default=None,
        max_length=150,
    )

    step_orders: list[int] = Field(
        default_factory=list,
    )

    notes: str | None = None


class RunbookExecutionResult(BaseModel):
    """Outcome of a runbook execution."""

    incident_id: str
    runbook_id: str

    status: str = Field(
        min_length=1,
        max_length=30,
    )

    executed_steps: list[int] = Field(
        default_factory=list,
    )

    successful_steps: list[int] = Field(
        default_factory=list,
    )

    failed_steps: list[int] = Field(
        default_factory=list,
    )

    skipped_steps: list[int] = Field(
        default_factory=list,
    )

    summary: str | None = None

    evidence: list[str] = Field(
        default_factory=list,
    )

    completed_at: datetime


class RunbookExperience(BaseModel):
    """Historical effectiveness of a runbook."""

    runbook_id: str

    runbook_name: str

    executions: int = Field(
        default=0,
        ge=0,
    )

    successful_executions: int = Field(
        default=0,
        ge=0,
    )

    failed_executions: int = Field(
        default=0,
        ge=0,
    )

    success_rate: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    common_success_conditions: list[str] = Field(
        default_factory=list,
    )

    common_failure_conditions: list[str] = Field(
        default_factory=list,
    )

    warnings: list[str] = Field(
        default_factory=list,
    )

    last_executed_at: datetime | None = None


class RunbookRecommendation(BaseModel):
    """Hindsight-informed runbook recommendation."""

    runbook_id: str

    runbook_name: str

    relevance_score: float = Field(
        ge=0.0,
        le=1.0,
    )

    why_recommended: str

    known_success_pattern: str | None = None

    known_failure_pattern: str | None = None

    caution: str | None = None

    experience_count: int = Field(
        default=0,
        ge=0,
    )