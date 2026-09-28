from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.db.models.hypothesis import Hypothesis
from app.db.models.incident import Incident
from app.db.models.incident_event import IncidentEvent
from app.db.models.investigation_action import InvestigationAction
from app.schemas.investigation import (
    HypothesisCreate,
    HypothesisRead,
    HypothesisUpdate,
    InvestigationActionRead,
    InvestigationSummary,
    InvestigationTimelineItem,
)
from app.services.hindsight_service import hindsight_service


def record_investigation_action(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
    action: str,
    result: str,
    actor: str | None = None,
    reason: str | None = None,
    evidence: list[str] | None = None,
    runbook_id: str | None = None,
    hypothesis_id: str | None = None,
    timestamp: datetime | None = None,
) -> InvestigationActionRead:
    """Persist an engineer decision/action in PostgreSQL."""

    incident = db.scalar(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    )

    if incident is None:
        raise ValueError("Incident not found.")

    action_timestamp = timestamp or utcnow()
    normalized_result = result.strip().lower()
    normalized_action = action.strip()

    investigation_action = InvestigationAction(
        id=str(uuid4()),
        incident_id=incident_id,
        runbook_id=runbook_id,
        hypothesis_id=hypothesis_id,
        action=normalized_action,
        actor=actor,
        timestamp=action_timestamp,
        result=normalized_result,
        reason=reason,
        evidence=evidence or [],
        action_metadata={
            "source": "retrax",
            "organization_id": organization_id,
        },
    )

    db.add(investigation_action)

    # Keep an IncidentEvent as an audit/event-stream record.
    #
    # Important:
    # The event is NOT treated as a second investigation action by
    # get_investigation_summary(). The InvestigationAction is the
    # canonical source for the decision trajectory.
    event = IncidentEvent(
        id=str(uuid4()),
        incident_id=incident_id,
        event_type="investigation_action",
        timestamp=action_timestamp,
        actor=actor,
        title=normalized_action,
        description=reason,
        event_metadata={
            "result": normalized_result,
            "hypothesis_id": hypothesis_id,
            "runbook_id": runbook_id,
            "evidence": evidence or [],
            "investigation_action_id": investigation_action.id,
        },
    )

    db.add(event)

    db.commit()
    db.refresh(investigation_action)

    return InvestigationActionRead.model_validate(
        investigation_action
    )


def create_hypothesis(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
    payload: HypothesisCreate,
) -> HypothesisRead:
    """Create an investigation hypothesis."""

    incident = db.scalar(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    )

    if incident is None:
        raise ValueError("Incident not found.")

    hypothesis = Hypothesis(
        id=str(uuid4()),
        incident_id=incident_id,
        name=payload.name.strip(),
        description=payload.description,
        confidence=payload.confidence,
        status=payload.status.strip().lower(),
        supporting_evidence=payload.supporting_evidence,
        created_at=utcnow(),
        updated_at=utcnow(),
    )

    db.add(hypothesis)

    # Keep the event for the general incident event stream.
    # The hypothesis itself remains the canonical hypothesis record.
    db.add(
        IncidentEvent(
            id=str(uuid4()),
            incident_id=incident_id,
            event_type="hypothesis_created",
            timestamp=utcnow(),
            actor=None,
            title=payload.name.strip(),
            description=payload.description,
            event_metadata={
                "confidence": payload.confidence,
                "status": payload.status,
                "hypothesis_id": hypothesis.id,
            },
        )
    )

    db.commit()
    db.refresh(hypothesis)

    return HypothesisRead.model_validate(hypothesis)


def list_hypotheses(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
) -> list[HypothesisRead]:
    """List hypotheses belonging to an incident."""

    incident = db.scalar(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    )

    if incident is None:
        raise ValueError("Incident not found.")

    hypotheses = db.scalars(
        select(Hypothesis)
        .where(Hypothesis.incident_id == incident_id)
        .order_by(
            Hypothesis.confidence.desc(),
            Hypothesis.created_at.asc(),
        )
    ).all()

    return [
        HypothesisRead.model_validate(hypothesis)
        for hypothesis in hypotheses
    ]


def update_hypothesis(
    db: Session,
    *,
    hypothesis_id: str,
    incident_id: str,
    organization_id: str,
    payload: HypothesisUpdate,
) -> HypothesisRead:
    """Update a hypothesis."""

    hypothesis = db.scalar(
        select(Hypothesis)
        .join(
            Incident,
            Hypothesis.incident_id == Incident.id,
        )
        .where(
            Hypothesis.id == hypothesis_id,
            Hypothesis.incident_id == incident_id,
            Incident.organization_id == organization_id,
        )
    )

    if hypothesis is None:
        raise ValueError("Hypothesis not found.")

    data = payload.model_dump(exclude_unset=True)

    for field, value in data.items():
        setattr(hypothesis, field, value)

    hypothesis.updated_at = utcnow()

    db.commit()
    db.refresh(hypothesis)

    return HypothesisRead.model_validate(hypothesis)


def add_incident_event(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
    event_type: str,
    title: str,
    description: str | None = None,
    actor: str | None = None,
    timestamp: datetime | None = None,
    event_metadata: dict | None = None,
) -> IncidentEvent:
    """Append a durable event to the incident timeline."""

    incident = db.scalar(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    )

    if incident is None:
        raise ValueError("Incident not found.")

    event = IncidentEvent(
        id=str(uuid4()),
        incident_id=incident_id,
        event_type=event_type,
        timestamp=timestamp or utcnow(),
        actor=actor,
        title=title,
        description=description,
        event_metadata=event_metadata or {},
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return event


def get_investigation_summary(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
) -> InvestigationSummary:
    """
    Return the investigation state and one canonical timeline.

    InvestigationAction is the canonical source for engineer decisions.
    Hypothesis is the canonical source for hypotheses.

    IncidentEvent remains available as the broader audit/event stream,
    but action/hypothesis creation events are not inserted into the
    unified trajectory because doing so would duplicate the same
    decision/hypothesis.
    """

    incident = db.scalar(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    )

    if incident is None:
        raise ValueError("Incident not found.")

    hypotheses = db.scalars(
        select(Hypothesis)
        .where(Hypothesis.incident_id == incident_id)
        .order_by(Hypothesis.created_at.asc())
    ).all()

    actions = db.scalars(
        select(InvestigationAction)
        .where(InvestigationAction.incident_id == incident_id)
        .order_by(InvestigationAction.timestamp.asc())
    ).all()

    events = db.scalars(
        select(IncidentEvent)
        .where(IncidentEvent.incident_id == incident_id)
        .order_by(IncidentEvent.timestamp.asc())
    ).all()

    hypothesis_reads = [
        HypothesisRead.model_validate(hypothesis)
        for hypothesis in hypotheses
    ]

    action_reads = [
        InvestigationActionRead.model_validate(action)
        for action in actions
    ]

    timeline: list[InvestigationTimelineItem] = []

    # ------------------------------------------------------------------
    # General incident events
    # ------------------------------------------------------------------
    #
    # investigation_action and hypothesis_created are deliberately
    # excluded here because their canonical records are appended below.
    #
    # This prevents:
    #
    #   InvestigationAction + IncidentEvent
    #
    # from appearing as two separate actions in the UI.
    #
    canonical_event_types = {
        "investigation_action",
        "hypothesis_created",
    }

    for event in events:
        if event.event_type in canonical_event_types:
            continue

        timeline.append(
            InvestigationTimelineItem(
                type=event.event_type,
                id=event.id,
                timestamp=event.timestamp,
                title=event.title,
                description=event.description,
                status=(
                    str(event.event_metadata.get("result"))
                    if event.event_metadata
                    and event.event_metadata.get("result")
                    else None
                ),
            )
        )

    # ------------------------------------------------------------------
    # Canonical hypotheses
    # ------------------------------------------------------------------

    for hypothesis in hypotheses:
        timeline.append(
            InvestigationTimelineItem(
                type="hypothesis",
                id=hypothesis.id,
                timestamp=hypothesis.created_at,
                title=hypothesis.name,
                description=hypothesis.description,
                status=hypothesis.status,
                confidence=hypothesis.confidence,
            )
        )

    # ------------------------------------------------------------------
    # Canonical investigation actions
    # ------------------------------------------------------------------

    for action in actions:
        timeline.append(
            InvestigationTimelineItem(
                type="action",
                id=action.id,
                timestamp=action.timestamp,
                title=action.action,
                description=action.reason,
                status=action.result,
                evidence=action.evidence or [],
                reason=action.reason,
            )
        )

    # Stable chronological ordering.
    #
    # When two records have exactly the same timestamp, the canonical
    # investigation action/hypothesis should remain deterministic.
    timeline.sort(
        key=lambda item: (
            item.timestamp,
            item.type,
            item.id,
        )
    )

    successful = sum(
        1
        for action in actions
        if action.result.lower() == "success"
    )

    failed = sum(
        1
        for action in actions
        if action.result.lower() == "failure"
    )

    active_hypothesis = next(
        (
            hypothesis
            for hypothesis in hypotheses
            if hypothesis.status.lower()
            in {
                "open",
                "investigating",
                "active",
            }
        ),
        None,
    )

    return InvestigationSummary(
        incident_id=incident_id,
        hypotheses=hypothesis_reads,
        actions=action_reads,
        timeline=timeline,
        active_hypothesis_id=(
            active_hypothesis.id
            if active_hypothesis
            else None
        ),
        total_actions=len(actions),
        successful_actions=successful,
        failed_actions=failed,
    )


async def remember_investigation_action(
    *,
    organization_id: str,
    incident_id: str,
    service_id: str,
    action: str,
    result: str,
    actor: str | None = None,
    reason: str | None = None,
    evidence: list[str] | None = None,
    runbook_id: str | None = None,
    hypothesis_id: str | None = None,
    timestamp: datetime | None = None,
) -> None:
    """
    Retain the decision trajectory in Hindsight.

    Both successful and failed actions are durable experience.
    """

    normalized_result = result.strip().lower()

    memory_type = (
        "successful_action"
        if normalized_result == "success"
        else "failed_action"
        if normalized_result == "failure"
        else "investigation_action"
    )

    content = (
        f"Investigation action during incident {incident_id}.\n"
        f"Action: {action}\n"
        f"Actor: {actor or 'Unknown'}\n"
        f"Result: {normalized_result}\n"
        f"Reason: {reason or 'Not recorded'}\n"
        f"Evidence: {evidence or []}\n"
        f"Runbook: {runbook_id or 'None'}\n"
        f"Hypothesis: {hypothesis_id or 'None'}"
    )

    tags = [
        "retrax",
        f"experience:{memory_type}",
        f"organization:{organization_id}",
        f"service:{service_id}",
        f"incident:{incident_id}",
    ]

    if normalized_result == "failure":
        tags.append("warning:do-not-repeat")

    await hindsight_service.retain(
        content=content,
        memory_type=memory_type,
        organization_id=organization_id,
        incident_id=incident_id,
        service_id=service_id,
        tags=tags,
        timestamp=timestamp,
        context=(
            "RETRAX decision trajectory memory. Preserve the investigation "
            "path, including successful and failed actions, so future "
            "engineers can learn from previous decisions."
        ),
    )