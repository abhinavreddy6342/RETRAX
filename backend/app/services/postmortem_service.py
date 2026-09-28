from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.incident import Incident
from app.db.models.postmortem import Postmortem
from app.schemas.postmortem import (
    PostmortemCreate,
    PostmortemLearning,
    PostmortemUpdate,
)
from app.services import memory_service
from app.services.hindsight_service import hindsight_service


def _serialize_timeline(timeline) -> list[dict]:
    """Convert Pydantic timeline entries into JSON-safe dictionaries."""

    return [
        item.model_dump(mode="json")
        if hasattr(item, "model_dump")
        else item
        for item in timeline
    ]


def create_postmortem(
    db: Session,
    *,
    organization_id: str,
    payload: PostmortemCreate,
) -> Postmortem:
    """Create a postmortem for an organization-owned incident."""

    incident = db.execute(
        select(Incident).where(
            Incident.id == payload.incident_id,
            Incident.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if incident is None:
        raise ValueError("Incident not found.")

    existing = db.execute(
        select(Postmortem.id).where(
            Postmortem.incident_id == payload.incident_id,
        )
    ).scalar_one_or_none()

    if existing is not None:
        raise ValueError(
            "A postmortem already exists for this incident."
        )

    postmortem = Postmortem(
        id=str(uuid4()),
        incident_id=payload.incident_id,
        summary=payload.summary,
        impact=payload.impact,
        timeline=_serialize_timeline(
            payload.timeline
        ),
        root_cause=payload.root_cause,
        contributing_factors=payload.contributing_factors,
        successful_actions=payload.successful_actions,
        failed_actions=payload.failed_actions,
        preventive_actions=payload.preventive_actions,
        lessons_learned=payload.lessons_learned,
    )

    db.add(postmortem)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(postmortem)

    return postmortem


def get_postmortem(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
) -> Postmortem:
    """Get the postmortem for an organization-owned incident."""

    postmortem = db.execute(
        select(Postmortem)
        .join(
            Incident,
            Incident.id == Postmortem.incident_id,
        )
        .where(
            Postmortem.incident_id == incident_id,
            Incident.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if postmortem is None:
        raise ValueError("Postmortem not found.")

    return postmortem


def update_postmortem(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
    payload: PostmortemUpdate,
) -> Postmortem:
    """Update an existing postmortem."""

    postmortem = get_postmortem(
        db,
        incident_id=incident_id,
        organization_id=organization_id,
    )

    values = payload.model_dump(
        exclude_unset=True,
    )

    if (
        "timeline" in values
        and values["timeline"] is not None
    ):
        values["timeline"] = _serialize_timeline(
            values["timeline"]
        )

    for field, value in values.items():
        setattr(
            postmortem,
            field,
            value,
        )

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(postmortem)

    return postmortem


def delete_postmortem(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
) -> None:
    """Delete an incident postmortem."""

    postmortem = get_postmortem(
        db,
        incident_id=incident_id,
        organization_id=organization_id,
    )

    db.delete(postmortem)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


async def learn_from_postmortem(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
) -> PostmortemLearning:
    """
    Convert a postmortem into durable engineering experience.

    The structured postmortem is retained in Hindsight and then reflected
    to identify recurring patterns and knowledge gaps.
    """

    postmortem = get_postmortem(
        db,
        incident_id=incident_id,
        organization_id=organization_id,
    )

    incident = db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    ).scalar_one()

    successful_actions = [
        str(item)
        for item in (
            postmortem.successful_actions or []
        )
    ]

    failed_actions = [
        str(item)
        for item in (
            postmortem.failed_actions or []
        )
    ]

    lessons = [
        str(item)
        for item in (
            postmortem.lessons_learned or []
        )
    ]

    preventive_actions = [
        str(item)
        for item in (
            postmortem.preventive_actions or []
        )
    ]

    await memory_service.remember_incident_resolution(
        organization_id=organization_id,
        incident_id=incident_id,
        service_id=incident.service_id,
        incident_key=incident.incident_key,
        title=incident.title,
        description=postmortem.summary,
        root_cause=postmortem.root_cause,
        successful_actions=successful_actions,
        failed_actions=failed_actions,
        lessons=lessons,
        preventive_actions=preventive_actions,
        timestamp=postmortem.created_at,
    )

    context = (
        f"Incident: {incident.incident_key}\n"
        f"Title: {incident.title}\n"
        f"Summary: {postmortem.summary}\n"
        f"Impact: {postmortem.impact or 'Not recorded'}\n"
        f"Root cause: {postmortem.root_cause or 'Not recorded'}\n"
        f"Contributing factors: "
        f"{postmortem.contributing_factors or []}\n"
        f"Successful actions: {successful_actions}\n"
        f"Failed actions: {failed_actions}\n"
        f"Preventive actions: {preventive_actions}\n"
        f"Lessons learned: {lessons}"
    )

    reflection = await hindsight_service.reflect(
        query=(
            "Analyze this postmortem for durable engineering learning. "
            "Identify recurring failure patterns, lessons, preventive "
            "measures, and knowledge gaps that future engineers should know."
        ),
        context=context,
        organization_id=organization_id,
        service_id=incident.service_id,
        incident_id=incident.id,
    )

    reflection_text = str(
        reflection.get("text", "")
    ).strip()

    recurring_pattern = (
        postmortem.root_cause
        if postmortem.root_cause
        else None
    )

    knowledge_gaps: list[str] = []

    if not postmortem.root_cause:
        knowledge_gaps.append(
            "Root cause was not explicitly recorded."
        )

    if not postmortem.preventive_actions:
        knowledge_gaps.append(
            "Preventive actions were not explicitly recorded."
        )

    if not postmortem.successful_actions:
        knowledge_gaps.append(
            "No successful resolution actions were recorded."
        )

    if not postmortem.lessons_learned:
        knowledge_gaps.append(
            "No lessons learned were explicitly recorded."
        )

    if reflection_text:
        reflection_lines = [
            line.strip(" -*")
            for line in reflection_text.splitlines()
            if line.strip()
        ]

        for line in reflection_lines:
            lowered = line.lower()

            if (
                "recurring" in lowered
                and recurring_pattern is None
            ):
                recurring_pattern = line

            if (
                "gap" in lowered
                or "missing" in lowered
                or "unknown" in lowered
            ):
                knowledge_gaps.append(line)

    return PostmortemLearning(
        incident_id=incident.id,
        root_cause=postmortem.root_cause,
        successful_patterns=successful_actions,
        failed_patterns=failed_actions,
        lessons=lessons,
        preventive_actions=preventive_actions,
        recurring_pattern=recurring_pattern,
        knowledge_gaps=_deduplicate(
            knowledge_gaps
        )[:10],
        confidence=(
            0.9
            if (
                postmortem.root_cause
                and successful_actions
                and preventive_actions
            )
            else 0.7
            if postmortem.root_cause
            else 0.5
        ),
    )


def _deduplicate(
    items: list[str],
) -> list[str]:
    """Deduplicate text while preserving order."""

    seen: set[str] = set()
    result: list[str] = []

    for item in items:
        normalized = " ".join(
            item.lower().split()
        )

        if normalized in seen:
            continue

        seen.add(normalized)
        result.append(item)

    return result