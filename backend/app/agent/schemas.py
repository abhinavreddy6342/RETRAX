from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AgentChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=3000)


class AgentChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[AgentChatTurn] = Field(default_factory=list, max_length=12)

    @field_validator("message")
    @classmethod
    def trim_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be blank.")
        return value


class AgentMemorySource(BaseModel):
    memory_id: str | None = None
    memory_type: str | None = None
    score: float | None = None
    source_incident_key: str | None = None
    content: str


class AgentChatResponse(BaseModel):
    incident_id: str
    answer: str
    historical_memory_status: Literal["available", "partial", "unavailable"]
    memories_used: int | None = None
    sources: list[AgentMemorySource] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class AgentInvestigationResponse(BaseModel):
    incident_id: str

    summary: str

    historical_experience: list[dict] = Field(
        default_factory=list,
    )

    reasoning: str

    recommended_actions: list[str] = Field(
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

    preventive_insights: list[str] = Field(
        default_factory=list,
    )

    confidence: float = Field(
        ge=0.0,
        le=1.0,
    )

    memory_count: int = Field(
        ge=0,
    )
class IncidentComparisonResponse(BaseModel):
    incident_id: str
    similarity_summary: str = ""
    similarities: list[str] = Field(default_factory=list)
    differences: list[str] = Field(default_factory=list)
    historical_root_causes: list[str] = Field(default_factory=list)
    historical_successes: list[str] = Field(default_factory=list)
    historical_failures: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    memory_count: int = 0
    confidence: float = 0.0
