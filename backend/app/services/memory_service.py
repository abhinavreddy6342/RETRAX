from __future__ import annotations

from datetime import datetime
from typing import Any

from app.schemas.memory import (
    MemoryConflict,
    MemoryCreate,
    MemoryFreshness,
    MemoryHealth,
    MemoryRecallItem,
    MemoryRecallRequest,
    MemoryRecallResponse,
    MemoryReflectRequest,
    MemoryReflection,
)
from app.services.hindsight_service import hindsight_service


async def create_memory(
    payload: MemoryCreate,
) -> dict[str, Any]:
    """Store durable engineering experience in Hindsight."""

    result = await hindsight_service.retain(
        content=payload.content,
        memory_type=payload.memory_type,
        organization_id=payload.organization_id,
        incident_id=payload.incident_id,
        service_id=payload.service_id,
        tags=payload.tags,
    )

    return {
        "status": "stored",
        "memory_type": payload.memory_type,
        "organization_id": payload.organization_id,
        "incident_id": payload.incident_id,
        "service_id": payload.service_id,
        "result": result,
    }


async def recall_memories(
    payload: MemoryRecallRequest,
) -> MemoryRecallResponse:
    """Recall historical engineering experience relevant to a query."""

    response = await hindsight_service.recall(
        query=payload.query,
        limit=payload.limit,
        memory_types=payload.memory_types or None,
        organization_id=payload.organization_id,
        service_id=payload.service_id,
        incident_id=payload.incident_id,
    )

    items: list[MemoryRecallItem] = []

    for item in response.get("results", []):
        items.append(
            MemoryRecallItem(
                content=item.get("content") or item.get("text", ""),
                memory_type=item.get("memory_type") or item.get("type"),
                memory_id=item.get("id"),
                relevance=item.get("relevance") if item.get("relevance") is not None else item.get("score"),
                incident_id=item.get("incident_id") or payload.incident_id,
                incident_key=item.get("incident_key"),
                service_id=item.get("service_id") or payload.service_id,
                service=item.get("service"),
                occurred_at=item.get("occurred_at"),
                tags=item.get("tags") or [],
                similarity_reason=item.get("similarity_reason"),
                provenance=item.get("provenance"),
            )
        )

    return MemoryRecallResponse(
        query=payload.query,
        items=items,
        total=len(items),
        provider=response.get("provider", "hindsight"),
        hindsight_available=response.get("hindsight_available", True),
        demo_memory=response.get("demo_memory", False),
    )


async def reflect_memories(
    payload: MemoryReflectRequest,
) -> MemoryReflection:
    """Synthesize historical engineering experience."""

    response = await hindsight_service.reflect(
        query=payload.query,
        context=(
            str(payload.context)
            if payload.context
            else None
        ),
        memory_types=None,
        organization_id=payload.organization_id,
        service_id=payload.service_id,
        incident_id=payload.incident_id,
    )

    text = response.get("text", "")

    # Extract structured sections if present in reflection markdown
    successful_patterns: list[str] = []
    failed_patterns: list[str] = []
    warnings: list[str] = []
    recommendations: list[str] = []

    current_section = None
    for line in text.splitlines():
        trimmed = line.strip()
        if not trimmed:
            continue
        lower = trimmed.lower()
        if "what worked" in lower or "successful" in lower:
            current_section = "success"
            continue
        elif "what failed" in lower:
            current_section = "failure"
            continue
        elif "what should not be repeated" in lower or "warning" in lower:
            current_section = "warning"
            continue
        elif "recommendation" in lower:
            current_section = "recommendation"
            continue
        elif trimmed.startswith("#"):
            current_section = None
            continue

        item_text = trimmed.lstrip("-*•123456789. \t")
        if item_text and current_section:
            if current_section == "success":
                successful_patterns.append(item_text)
            elif current_section == "failure":
                failed_patterns.append(item_text)
            elif current_section == "warning":
                warnings.append(item_text)
            elif current_section == "recommendation":
                recommendations.append(item_text)

    return MemoryReflection(
        conclusion=text,
        successful_patterns=successful_patterns,
        failed_patterns=failed_patterns,
        warnings=warnings,
        recommendations=recommendations,
        provider=response.get("provider", "hindsight"),
        hindsight_available=response.get("hindsight_available", True),
        demo_memory=response.get("demo_memory", False),
        provenance={
            "based_on": response.get("based_on"),
            "source": response.get("provider", "hindsight"),
        },
    )


async def remember_successful_action(
    *,
    organization_id: str,
    incident_id: str,
    service_id: str,
    action: str,
    result: str,
    reason: str | None = None,
) -> Any:
    """Store a successful engineering action."""

    content = (
        f"Incident {incident_id}: successful investigation action.\n"
        f"Action: {action}\n"
        f"Result: {result}\n"
        f"Why it helped: {reason or 'Not recorded'}"
    )

    return await hindsight_service.retain(
        content=content,
        memory_type="successful_action",
        organization_id=organization_id,
        incident_id=incident_id,
        service_id=service_id,
        tags=[
            "experience:success",
            "outcome:successful",
        ],
    )


async def remember_failed_action(
    *,
    organization_id: str,
    incident_id: str,
    service_id: str,
    action: str,
    reason: str,
) -> Any:
    """Store a failed action so future responders can avoid repeating it."""

    from app.services.hindsight_service import retain_failed_action

    return await retain_failed_action(
        incident_id=incident_id,
        organization_id=organization_id,
        service_id=service_id,
        action=action,
        reason=reason,
    )


async def remember_incident_resolution(
    *,
    organization_id: str,
    incident_id: str,
    service_id: str,
    incident_key: str,
    title: str,
    description: str,
    root_cause: str | None,
    successful_actions: list[str],
    failed_actions: list[str],
    lessons: list[str],
    preventive_actions: list[str],
    timestamp: datetime | None = None,
) -> Any:
    """Store a completed incident as durable organizational experience."""

    from app.services.hindsight_service import retain_incident_experience

    return await retain_incident_experience(
        incident_key=incident_key,
        title=title,
        description=description,
        root_cause=root_cause,
        successful_actions=successful_actions,
        failed_actions=failed_actions,
        lessons=lessons,
        preventive_actions=preventive_actions,
        organization_id=organization_id,
        service_id=service_id,
        timestamp=timestamp,
    )


async def recall_incident_experience(
    *,
    organization_id: str,
    query: str,
    service_id: str | None = None,
    limit: int = 10,
) -> MemoryRecallResponse:
    """Retrieve historical incident experience."""

    return await recall_memories(
        MemoryRecallRequest(
            query=query,
            organization_id=organization_id,
            service_id=service_id,
            limit=limit,
        )
    )


async def reflect_on_incident_experience(
    *,
    organization_id: str,
    query: str,
    service_id: str | None = None,
    incident_id: str | None = None,
    context: dict | None = None,
) -> MemoryReflection:
    """Generate Hindsight reasoning from organizational experience."""

    return await reflect_memories(
        MemoryReflectRequest(
            query=query,
            organization_id=organization_id,
            service_id=service_id,
            incident_id=incident_id,
            context=context,
        )
    )


def build_memory_health(
    *,
    organization_id: str,
    total_memories: int = 0,
    memories_last_7_days: int = 0,
    memories_last_30_days: int = 0,
    stale_memories: int = 0,
    conflicting_memories: int = 0,
    successful_experiences: int = 0,
    failed_experiences: int = 0,
) -> MemoryHealth:
    """Build memory-health metrics for the dashboard."""

    total_experiences = (
        successful_experiences + failed_experiences
    )

    average_confidence = (
        successful_experiences / total_experiences
        if total_experiences
        else 0.0
    )

    return MemoryHealth(
        organization_id=organization_id,
        total_memories=total_memories,
        memories_last_7_days=memories_last_7_days,
        memories_last_30_days=memories_last_30_days,
        stale_memories=stale_memories,
        conflicting_memories=conflicting_memories,
        successful_experiences=successful_experiences,
        failed_experiences=failed_experiences,
        average_confidence=average_confidence,
    )


def build_memory_conflict(
    *,
    memory_ids: list[str],
    topic: str,
    conflict: str,
    newer_memory_id: str | None = None,
) -> MemoryConflict:
    """Represent conflicting historical engineering knowledge."""

    return MemoryConflict(
        memory_ids=memory_ids,
        topic=topic,
        conflict=conflict,
        newer_memory_id=newer_memory_id,
        resolution_status="unresolved",
    )


def build_memory_freshness(
    *,
    memory_id: str,
    age_days: int,
    freshness_score: float,
    status: str,
    reason: str | None = None,
) -> MemoryFreshness:
    """Represent the freshness of a historical memory."""

    return MemoryFreshness(
        memory_id=memory_id,
        age_days=age_days,
        freshness_score=max(0.0, min(1.0, freshness_score)),
        status=status,
        reason=reason,
    )