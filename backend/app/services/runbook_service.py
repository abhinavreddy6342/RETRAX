from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.incident import Incident
from app.db.models.investigation_action import InvestigationAction
from app.db.models.runbook import Runbook
from app.schemas.runbook import (
    RunbookCreate,
    RunbookExecutionResult,
    RunbookExperience,
    RunbookRecommendation,
    RunbookUpdate,
)
from app.services.hindsight_service import hindsight_service


def _runbook_to_dict(runbook: Runbook) -> dict:
    """Serialize a runbook's JSON-backed fields safely."""

    return {
        "id": runbook.id,
        "organization_id": runbook.organization_id,
        "service_id": runbook.service_id,
        "runbook_key": runbook.runbook_key,
        "name": runbook.name,
        "description": runbook.description,
        "steps": runbook.steps or [],
        "risk_level": runbook.risk_level,
        "created_at": runbook.created_at,
        "updated_at": runbook.updated_at,
    }


def create_runbook(
    db: Session,
    *,
    payload: RunbookCreate,
) -> Runbook:
    """Create a runbook after validating its service ownership."""

    if payload.service_id:
        service = db.execute(
            select(Incident.service_id).where(
                Incident.organization_id == payload.organization_id,
                Incident.service_id == payload.service_id,
            )
        ).first()

        if service is None:
            from app.db.models.service import Service

            service_exists = db.execute(
                select(Service.id).where(
                    Service.id == payload.service_id,
                    Service.organization_id == payload.organization_id,
                )
            ).scalar_one_or_none()

            if service_exists is None:
                raise ValueError(
                    "Service does not belong to the organization."
                )

    duplicate = db.execute(
        select(Runbook.id).where(
            Runbook.organization_id == payload.organization_id,
            Runbook.runbook_key == payload.runbook_key,
        )
    ).scalar_one_or_none()

    if duplicate is not None:
        raise ValueError(
            f"Runbook key '{payload.runbook_key}' already exists."
        )

    runbook = Runbook(
        id=str(uuid4()),
        organization_id=payload.organization_id,
        service_id=payload.service_id,
        runbook_key=payload.runbook_key,
        name=payload.name,
        description=payload.description,
        steps=[
            step.model_dump()
            for step in payload.steps
        ],
        risk_level=payload.risk_level,
    )

    db.add(runbook)
    db.commit()
    db.refresh(runbook)

    return runbook


def get_runbook(
    db: Session,
    *,
    runbook_id: str,
    organization_id: str,
) -> Runbook:
    """Get one runbook scoped to an organization."""

    runbook = db.execute(
        select(Runbook).where(
            Runbook.id == runbook_id,
            Runbook.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if runbook is None:
        raise ValueError("Runbook not found.")

    return runbook


def list_runbooks(
    db: Session,
    *,
    organization_id: str,
    service_id: str | None = None,
) -> list[Runbook]:
    """List runbooks for an organization, optionally scoped to a service."""

    statement = select(Runbook).where(
        Runbook.organization_id == organization_id,
    )

    if service_id:
        statement = statement.where(
            Runbook.service_id == service_id,
        )

    statement = statement.order_by(
        Runbook.name.asc(),
    )

    return list(
        db.execute(statement).scalars().all()
    )


def update_runbook(
    db: Session,
    *,
    runbook_id: str,
    organization_id: str,
    payload: RunbookUpdate,
) -> Runbook:
    """Update a runbook while preserving organization boundaries."""

    runbook = get_runbook(
        db,
        runbook_id=runbook_id,
        organization_id=organization_id,
    )

    update_data = payload.model_dump(
        exclude_unset=True,
    )

    if "service_id" in update_data:
        service_id = update_data["service_id"]

        if service_id:
            from app.db.models.service import Service

            service_exists = db.execute(
                select(Service.id).where(
                    Service.id == service_id,
                    Service.organization_id == organization_id,
                )
            ).scalar_one_or_none()

            if service_exists is None:
                raise ValueError(
                    "Service does not belong to the organization."
                )

    if "runbook_key" in update_data:
        duplicate = db.execute(
            select(Runbook.id).where(
                Runbook.organization_id == organization_id,
                Runbook.runbook_key == update_data["runbook_key"],
                Runbook.id != runbook_id,
            )
        ).scalar_one_or_none()

        if duplicate is not None:
            raise ValueError(
                f"Runbook key '{update_data['runbook_key']}' already exists."
            )

    if "steps" in update_data and update_data["steps"] is not None:
        update_data["steps"] = [
            step.model_dump()
            if hasattr(step, "model_dump")
            else step
            for step in update_data["steps"]
        ]

    for field, value in update_data.items():
        setattr(runbook, field, value)

    runbook.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(runbook)

    return runbook


def delete_runbook(
    db: Session,
    *,
    runbook_id: str,
    organization_id: str,
) -> None:
    """Delete a runbook belonging to the organization."""

    runbook = get_runbook(
        db,
        runbook_id=runbook_id,
        organization_id=organization_id,
    )

    db.delete(runbook)
    db.commit()


def get_runbook_experience(
    db: Session,
    *,
    runbook_id: str,
    organization_id: str,
) -> RunbookExperience:
    """
    Calculate real runbook effectiveness from investigation actions.

    Only explicit success/failure outcomes count as executions.
    Inconclusive/evaluated records remain in the investigation trail
    but do not distort the success rate.
    """

    runbook = get_runbook(
        db,
        runbook_id=runbook_id,
        organization_id=organization_id,
    )

    actions = db.execute(
        select(InvestigationAction)
        .join(
            Incident,
            Incident.id == InvestigationAction.incident_id,
        )
        .where(
            InvestigationAction.runbook_id == runbook_id,
            Incident.organization_id == organization_id,
        )
        .order_by(
            InvestigationAction.timestamp.asc(),
        )
    ).scalars().all()

    successful_results = {
        "success",
        "successful",
        "worked",
        "completed",
    }

    failed_results = {
        "failure",
        "failed",
        "unsuccessful",
        "error",
    }

    outcome_actions = [
        action
        for action in actions
        if str(action.result or "").strip().lower()
        in successful_results | failed_results
    ]

    successful_actions = [
        action
        for action in outcome_actions
        if str(action.result or "").strip().lower()
        in successful_results
    ]

    failed_actions = [
        action
        for action in outcome_actions
        if str(action.result or "").strip().lower()
        in failed_results
    ]

    executions = len(outcome_actions)
    successful_executions = len(successful_actions)
    failed_executions = len(failed_actions)

    success_rate = (
        successful_executions / executions
        if executions
        else 0.0
    )

    common_success_conditions: list[str] = []
    common_failure_conditions: list[str] = []
    warnings: list[str] = []

    for action in successful_actions:
        reason = str(
            action.reason or ""
        ).strip()

        if reason:
            common_success_conditions.append(reason)

    for action in failed_actions:
        reason = str(
            action.reason or ""
        ).strip()

        if reason:
            common_failure_conditions.append(reason)

        warnings.append(
            f"Previously failed runbook action: {action.action}"
        )

    last_executed_at = (
        outcome_actions[-1].timestamp
        if outcome_actions
        else None
    )

    return RunbookExperience(
        runbook_id=runbook.id,
        runbook_name=runbook.name,
        executions=executions,
        successful_executions=successful_executions,
        failed_executions=failed_executions,
        success_rate=success_rate,
        common_success_conditions=_deduplicate(
            common_success_conditions
        )[:10],
        common_failure_conditions=_deduplicate(
            common_failure_conditions
        )[:10],
        warnings=_deduplicate(
            warnings
        )[:10],
        last_executed_at=last_executed_at,
    )


async def get_runbook_recommendations(
    db: Session,
    *,
    organization_id: str,
    service_id: str,
    incident: Incident,
) -> list[RunbookRecommendation]:
    """
    Recommend runbooks using current incident signals plus historical
    Hindsight experience and persisted runbook outcomes.
    """

    runbooks = list_runbooks(
        db,
        organization_id=organization_id,
        service_id=service_id,
    )

    if not runbooks:
        return []

    query = (
        f"Incident: {incident.title}\n"
        f"Description: {incident.description}\n"
        f"Current error: {incident.current_error or 'None'}\n"
        f"Impact: {incident.impact or 'None'}\n"
        "Which runbooks or operational procedures were useful for similar "
        "incidents, and under what conditions did they work or fail?"
    )

    recall = await hindsight_service.recall(
        query=query,
        limit=8,
        organization_id=organization_id,
        service_id=service_id,
        incident_id=incident.id,
    )

    historical_text = "\n".join(
        str(item.get("text", ""))
        for item in recall.get("results", [])
    ).lower()

    current_text = " ".join(
        (
            incident.title,
            incident.description,
            incident.current_error or "",
            incident.impact or "",
        )
    ).lower()

    recommendations: list[RunbookRecommendation] = []

    for runbook in runbooks:
        experience = get_runbook_experience(
            db,
            runbook_id=runbook.id,
            organization_id=organization_id,
        )

        searchable = " ".join(
            (
                runbook.runbook_key,
                runbook.name,
                runbook.description or "",
                " ".join(
                    str(step.get("title", ""))
                    + " "
                    + str(step.get("instruction", ""))
                    for step in (runbook.steps or [])
                ),
            )
        ).lower()

        relevance = 0.25

        signal_words = {
            "connection",
            "database",
            "postgres",
            "timeout",
            "retry",
            "latency",
            "deployment",
            "payment",
            "checkout",
            "capacity",
            "5xx",
        }

        matched_signals = sum(
            1
            for signal in signal_words
            if signal in current_text
            and signal in searchable
        )

        relevance += min(
            0.40,
            matched_signals * 0.08,
        )

        historical_match = (
            runbook.runbook_key.lower() in historical_text
            or runbook.name.lower() in historical_text
        )

        if historical_match:
            relevance += 0.15

        if experience.executions:
            relevance += min(
                0.10,
                experience.executions * 0.02,
            )

            if experience.success_rate > 0:
                relevance += min(
                    0.10,
                    experience.success_rate * 0.10,
                )

        relevance = min(
            relevance,
            1.0,
        )

        known_success_pattern = (
            experience.common_success_conditions[0]
            if experience.common_success_conditions
            else None
        )

        known_failure_pattern = (
            experience.common_failure_conditions[0]
            if experience.common_failure_conditions
            else None
        )

        caution = None

        if experience.failed_executions:
            caution = (
                f"This runbook has {experience.failed_executions} "
                "historically failed execution(s); review the recorded "
                "failure conditions before using it."
            )

        why_recommended = (
            f"Matches the current incident signals with "
            f"{experience.executions} recorded outcome(s)."
        )

        if experience.successful_executions:
            why_recommended += (
                f" {experience.successful_executions} outcome(s) "
                "were recorded as successful."
            )

        if experience.success_rate > 0:
            why_recommended += (
                f" Historical outcome success rate: "
                f"{experience.success_rate:.0%}."
            )

        recommendations.append(
            RunbookRecommendation(
                runbook_id=runbook.id,
                runbook_name=runbook.name,
                relevance_score=relevance,
                why_recommended=why_recommended,
                known_success_pattern=known_success_pattern,
                known_failure_pattern=known_failure_pattern,
                caution=caution,
                experience_count=experience.executions,
            )
        )

    recommendations.sort(
        key=lambda item: item.relevance_score,
        reverse=True,
    )

    return recommendations[:5]


def _deduplicate(
    items: list[str],
) -> list[str]:
    """Remove duplicate text while preserving order."""

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


async def execute_runbook(
    db: Session,
    *,
    incident_id: str,
    runbook_id: str,
    organization_id: str,
    actor: str | None = None,
    step_orders: list[int] | None = None,
    notes: str | None = None,
) -> RunbookExecutionResult:
    """
    Validate and record a runbook execution plan.

    RETRAX does not execute arbitrary shell/Kubernetes commands.
    This endpoint records an evaluation trail and stores the decision
    in Hindsight. Actual success/failure is recorded separately by
    the investigation action endpoint.
    """

    from app.services.investigation_service import (
        record_investigation_action,
        remember_investigation_action,
    )

    runbook = get_runbook(
        db,
        runbook_id=runbook_id,
        organization_id=organization_id,
    )

    incident = db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if incident is None:
        raise ValueError("Incident not found.")

    if (
        runbook.service_id is not None
        and incident.service_id != runbook.service_id
    ):
        raise ValueError(
            "Runbook does not belong to the incident service."
        )

    steps = runbook.steps or []

    available_orders = {
        int(step.get("order"))
        for step in steps
        if step.get("order") is not None
    }

    requested_orders = (
        sorted(set(step_orders))
        if step_orders
        else sorted(available_orders)
    )

    invalid_orders = [
        order
        for order in requested_orders
        if order not in available_orders
    ]

    if invalid_orders:
        raise ValueError(
            f"Invalid runbook step order(s): {invalid_orders}"
        )

    selected_steps = [
        step
        for step in steps
        if int(step.get("order")) in requested_orders
    ]

    evidence = [
        (
            f"Step {step.get('order')}: "
            f"{step.get('title', 'Untitled step')}"
        )
        for step in selected_steps
    ]

    evidence.append(
        "Evaluation only: RETRAX did not execute the command field."
    )

    action = (
        f"Evaluate runbook '{runbook.name}' "
        f"for incident {incident.id}"
    )

    reason = (
        notes.strip()
        if notes and notes.strip()
        else (
            "Runbook execution plan was validated and recorded. "
            "Actual command execution requires engineer confirmation."
        )
    )

    action_read = record_investigation_action(
        db,
        incident_id=incident_id,
        organization_id=organization_id,
        action=action,
        result="inconclusive",
        actor=actor,
        reason=reason,
        evidence=evidence,
        runbook_id=runbook_id,
    )

    await remember_investigation_action(
        organization_id=organization_id,
        incident_id=incident_id,
        service_id=incident.service_id,
        action=action,
        result="inconclusive",
        actor=actor,
        reason=reason,
        evidence=evidence,
        runbook_id=runbook_id,
        timestamp=action_read.timestamp,
    )

    completed_at = (
        action_read.timestamp
        or datetime.now(timezone.utc)
    )

    skipped_steps = sorted(
        available_orders - set(requested_orders)
    )

    return RunbookExecutionResult(
        incident_id=incident_id,
        runbook_id=runbook_id,
        status="evaluated",
        executed_steps=requested_orders,
        successful_steps=[],
        failed_steps=[],
        skipped_steps=skipped_steps,
        summary=(
            f"Validated {len(requested_orders)} runbook step(s). "
            "No operational command was executed by RETRAX."
        ),
        evidence=evidence,
        completed_at=completed_at,
    )