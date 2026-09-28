from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EvaluationCreate(BaseModel):
    """Create an evaluation comparing incident reasoning modes."""

    organization_id: str = Field(
        min_length=1,
        max_length=36,
    )

    incident_id: str = Field(
        min_length=1,
        max_length=36,
    )

    mode: str = Field(
        min_length=1,
        max_length=30,
        description="Evaluation mode such as baseline, hindsight, or comparison.",
    )

    query: str = Field(
        min_length=1,
        description="Incident investigation question used for the evaluation.",
    )

    context: dict | None = None


class EvaluationResult(BaseModel):
    """Structured result of an evaluation run."""

    mode: str

    answer: str

    root_cause: str | None = None

    recommended_actions: list[str] = Field(
        default_factory=list,
    )

    successful_historical_patterns: list[str] = Field(
        default_factory=list,
    )

    failed_historical_patterns: list[str] = Field(
        default_factory=list,
    )

    warnings: list[str] = Field(
        default_factory=list,
    )

    memories_used: int = Field(
        default=0,
        ge=0,
    )

    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    reasoning_metadata: dict | None = None


class EvaluationRead(BaseModel):
    """Evaluation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    incident_id: str
    mode: str

    result: dict | None = None

    created_at: datetime


class EvaluationComparison(BaseModel):
    """Side-by-side comparison of baseline and Hindsight-assisted reasoning."""

    incident_id: str

    baseline: EvaluationResult

    hindsight: EvaluationResult

    additional_memories_used: int = Field(
        default=0,
        ge=0,
    )

    additional_historical_patterns: list[str] = Field(
        default_factory=list,
    )

    avoided_failed_actions: list[str] = Field(
        default_factory=list,
    )

    reasoning_changes: list[str] = Field(
        default_factory=list,
    )


class EvaluationSummary(BaseModel):
    """Aggregated evaluation metrics."""

    organization_id: str

    total_evaluations: int = Field(
        default=0,
        ge=0,
    )

    baseline_evaluations: int = Field(
        default=0,
        ge=0,
    )

    hindsight_evaluations: int = Field(
        default=0,
        ge=0,
    )

    average_memories_used: float = Field(
        default=0.0,
        ge=0.0,
    )

    incidents_with_improved_reasoning: int = Field(
        default=0,
        ge=0,
    )

    incidents_with_avoided_failed_actions: int = Field(
        default=0,
        ge=0,
    )