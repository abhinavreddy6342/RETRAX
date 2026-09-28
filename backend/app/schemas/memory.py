from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MemoryBase(BaseModel):
    """Common fields representing durable engineering experience."""

    content: str = Field(
        min_length=1,
        description="Durable engineering experience to store in Hindsight.",
    )

    memory_type: str = Field(
        min_length=1,
        max_length=50,
        description="Type of experience such as incident, resolution, failed_action, runbook, lesson, or hypothesis.",
    )

    service_id: str | None = Field(
        default=None,
        max_length=36,
    )

    incident_id: str | None = Field(
        default=None,
        max_length=36,
    )

    tags: list[str] = Field(
        default_factory=list,
    )

    importance: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
    )


class MemoryCreate(MemoryBase):
    """Request to store a durable memory."""

    organization_id: str = Field(
        min_length=1,
        max_length=36,
    )

    source: str = Field(
        default="retrax",
        min_length=1,
        max_length=100,
        description="Origin of the memory, such as postmortem, incident, investigation, or engineer.",
    )


class MemoryRead(MemoryBase):
    """Normalized memory returned by RETRAX."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str

    source: str
    created_at: datetime

    provenance: dict | None = None


class MemoryRecallRequest(BaseModel):
    """Request to retrieve relevant historical experience."""

    query: str = Field(
        min_length=1,
        description="Current incident context or engineering question.",
    )

    organization_id: str = Field(
        min_length=1,
        max_length=36,
    )

    service_id: str | None = Field(
        default=None,
        max_length=36,
    )

    incident_id: str | None = Field(
        default=None,
        max_length=36,
    )

    memory_types: list[str] = Field(
        default_factory=list,
    )

    limit: int = Field(
        default=10,
        ge=1,
        le=50,
    )


class MemoryRecallItem(BaseModel):
    """One recalled historical experience."""

    content: str
    memory_type: str | None = None

    memory_id: str | None = None
    incident_id: str | None = None
    incident_key: str | None = None
    service_id: str | None = None
    service: str | None = None
    occurred_at: str | None = None
    tags: list[str] = Field(
        default_factory=list,
    )

    relevance: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )

    similarity_reason: str | None = None
    provenance: dict | None = None


class MemoryRecallResponse(BaseModel):
    """Historical experience retrieved for an active investigation."""

    query: str
    items: list[MemoryRecallItem] = Field(
        default_factory=list,
    )

    total: int = 0
    provider: str | None = "hindsight"
    hindsight_available: bool = True
    demo_memory: bool = False


class MemoryReflectRequest(BaseModel):
    """Request to synthesize multiple memories into engineering guidance."""

    query: str = Field(
        min_length=1,
    )

    organization_id: str = Field(
        min_length=1,
        max_length=36,
    )

    service_id: str | None = Field(
        default=None,
        max_length=36,
    )

    incident_id: str | None = Field(
        default=None,
        max_length=36,
    )

    context: dict | None = None


class MemoryReflection(BaseModel):
    """Hindsight-powered synthesis of historical engineering experience."""

    conclusion: str

    supporting_memories: list[str] = Field(
        default_factory=list,
    )

    successful_patterns: list[str] = Field(
        default_factory=list,
    )

    failed_patterns: list[str] = Field(
        default_factory=list,
    )

    warnings: list[str] = Field(
        default_factory=list,
    )

    recommendations: list[str] = Field(
        default_factory=list,
    )

    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    provider: str | None = None
    hindsight_available: bool = True
    demo_memory: bool = False
    provenance: dict | None = None


class MemoryHealth(BaseModel):
    """Health and quality signals for the organization's engineering memory."""

    organization_id: str

    total_memories: int = 0
    memories_last_7_days: int = 0
    memories_last_30_days: int = 0

    stale_memories: int = 0
    conflicting_memories: int = 0

    successful_experiences: int = 0
    failed_experiences: int = 0

    average_confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )


class MemoryConflict(BaseModel):
    """Detected disagreement between historical memories."""

    memory_ids: list[str] = Field(
        min_length=1,
    )

    topic: str

    conflict: str

    newer_memory_id: str | None = None

    resolution_status: str = Field(
        default="unresolved",
        max_length=30,
    )


class MemoryFreshness(BaseModel):
    """Freshness assessment for a historical memory."""

    memory_id: str

    age_days: int = Field(
        ge=0,
    )

    freshness_score: float = Field(
        ge=0.0,
        le=1.0,
    )

    status: str = Field(
        max_length=30,
    )

    reason: str | None = None