from __future__ import annotations

from statistics import mean
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agent.orchestrator import incident_agent
from app.db.models.evaluation import Evaluation
from app.db.models.incident import Incident
from app.schemas.evaluation import (
    EvaluationComparison,
    EvaluationCreate,
    EvaluationRead,
    EvaluationResult,
    EvaluationSummary,
)


def _get_incident(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
) -> Incident:
    incident = db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if incident is None:
        raise ValueError("Incident not found.")

    return incident


def _save_evaluation(
    db: Session,
    *,
    payload: EvaluationCreate,
    result: EvaluationResult,
) -> Evaluation:
    evaluation = Evaluation(
        id=str(uuid4()),
        organization_id=payload.organization_id,
        incident_id=payload.incident_id,
        mode=payload.mode,
        result=result.model_dump(),
    )

    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    return evaluation


def _memory_provider(
    historical_experience: list[dict],
) -> tuple[str, bool]:
    """
    Determine the actual historical-memory provider represented by
    the retrieved memory records.

    Provider precedence is explicit:
    demo_memory + hindsight -> mixed
    demo_memory             -> demo_memory
    hindsight               -> hindsight
    otherwise               -> recorded_historical_memory
    """

    providers = {
        str(item.get("provider", "")).strip().lower()
        for item in historical_experience
        if isinstance(item, dict) and item.get("provider")
    }

    has_demo = "demo_memory" in providers
    has_hindsight = "hindsight" in providers

    if has_demo and has_hindsight:
        return "mixed", False

    if has_demo:
        return "demo_memory", False

    if has_hindsight:
        return "hindsight", True

    if historical_experience:
        return "recorded_historical_memory", False

    return "none", False


def baseline_investigation(
    *,
    incident: Incident,
    query: str,
) -> EvaluationResult:
    """
    Baseline reasoning without historical memory.

    This intentionally uses only current incident evidence.
    """

    current_error = (
        incident.current_error
        or "No current error was recorded."
    )

    answer = (
        f"Baseline analysis of {incident.incident_key}: "
        f"{incident.title}. "
        f"Current evidence indicates {current_error}. "
        "No historical memory was used."
    )

    recommended_actions = [
        "Inspect current service health and error metrics.",
        "Inspect recent deployments or configuration changes.",
        "Validate the current failure signature before remediation.",
    ]

    return EvaluationResult(
        mode="baseline",
        answer=answer,
        root_cause=None,
        recommended_actions=recommended_actions,
        successful_historical_patterns=[],
        failed_historical_patterns=[],
        warnings=[],
        memories_used=0,
        confidence=0.45,
        reasoning_metadata={
            "query": query,
            "historical_memory_used": False,
            "source": "current_incident_only",
            "memory_provider": "none",
            "hindsight_available": False,
            "root_cause_source": "not_confirmed",
        },
    )


async def hindsight_investigation(
    *,
    incident: Incident,
    query: str,
) -> EvaluationResult:
    """
    Run the RETRAX memory-assisted investigation agent.

    Hindsight remains the primary provider. When Hindsight is unavailable,
    the agent can use the local demo historical memory store and Ollama.
    """

    analysis = await incident_agent.investigate(
        incident=incident,
    )

    historical_experience = (
        analysis.historical_experience
        or []
    )

    memory_provider, hindsight_available = _memory_provider(
        historical_experience
    )

    current_root_cause = getattr(
        incident,
        "root_cause",
        None,
    )

    current_root_cause = (
        current_root_cause.strip()
        if isinstance(current_root_cause, str)
        else None
    )

    return EvaluationResult(
        mode="hindsight",
        answer=(
            analysis.reasoning
            or analysis.summary
        ),
        root_cause=current_root_cause,
        recommended_actions=analysis.recommended_actions,
        successful_historical_patterns=analysis.successful_patterns,
        failed_historical_patterns=analysis.failed_patterns,
        warnings=analysis.warnings,
        memories_used=analysis.memory_count,
        confidence=analysis.confidence,
        reasoning_metadata={
            "query": query,
            "historical_memory_used": bool(
                historical_experience
            ),
            "historical_experience": historical_experience,
            "memory_provider": memory_provider,
            "hindsight_available": hindsight_available,
            "root_cause_source": (
                "incident_record"
                if current_root_cause
                else "not_confirmed"
            ),
        },
    )


async def run_evaluation(
    db: Session,
    *,
    payload: EvaluationCreate,
) -> EvaluationRead:
    """Execute and persist a baseline or memory-assisted evaluation."""

    incident = _get_incident(
        db,
        incident_id=payload.incident_id,
        organization_id=payload.organization_id,
    )

    mode = payload.mode.strip().lower()

    if mode == "baseline":
        result = baseline_investigation(
            incident=incident,
            query=payload.query,
        )

    elif mode == "hindsight":
        result = await hindsight_investigation(
            incident=incident,
            query=payload.query,
        )

    else:
        raise ValueError(
            "Evaluation mode must be 'baseline' or 'hindsight'."
        )

    evaluation = _save_evaluation(
        db,
        payload=payload,
        result=result,
    )

    return EvaluationRead.model_validate(
        evaluation
    )


async def compare_evaluations(
    db: Session,
    *,
    organization_id: str,
    incident_id: str,
    query: str,
) -> EvaluationComparison:
    """
    Run both reasoning modes and produce a factual comparison.
    """

    incident = _get_incident(
        db,
        incident_id=incident_id,
        organization_id=organization_id,
    )

    baseline = baseline_investigation(
        incident=incident,
        query=query,
    )

    hindsight = await hindsight_investigation(
        incident=incident,
        query=query,
    )

    baseline_payload = EvaluationCreate(
        organization_id=organization_id,
        incident_id=incident_id,
        mode="baseline",
        query=query,
    )

    hindsight_payload = EvaluationCreate(
        organization_id=organization_id,
        incident_id=incident_id,
        mode="hindsight",
        query=query,
    )

    _save_evaluation(
        db,
        payload=baseline_payload,
        result=baseline,
    )

    _save_evaluation(
        db,
        payload=hindsight_payload,
        result=hindsight,
    )

    additional_patterns = _difference(
        hindsight.successful_historical_patterns
        + hindsight.failed_historical_patterns,
        [],
    )

    avoided_failed_actions = [
        failed
        for failed in hindsight.failed_historical_patterns
        if not any(
            _text_overlap(
                failed,
                recommendation,
            )
            for recommendation in baseline.recommended_actions
        )
    ]

    reasoning_changes: list[str] = []

    if hindsight.memories_used > baseline.memories_used:
        reasoning_changes.append(
            f"Memory-assisted evaluation used "
            f"{hindsight.memories_used} historical memory item(s), "
            "while baseline used none."
        )

    if hindsight.successful_historical_patterns:
        reasoning_changes.append(
            "Historical successful patterns were surfaced."
        )

    if hindsight.failed_historical_patterns:
        reasoning_changes.append(
            "Historical failed patterns were surfaced as cautions."
        )

    if hindsight.warnings:
        reasoning_changes.append(
            "Historical warnings were added to the investigation."
        )

    memory_provider = (
        hindsight.reasoning_metadata.get(
            "memory_provider",
            "none",
        )
        if hindsight.reasoning_metadata
        else "none"
    )

    hindsight_available = (
        bool(
            hindsight.reasoning_metadata.get(
                "hindsight_available",
                False,
            )
        )
        if hindsight.reasoning_metadata
        else False
    )

    comparison = EvaluationComparison(
        incident_id=incident_id,
        baseline=baseline,
        hindsight=hindsight,
        additional_memories_used=(
            hindsight.memories_used
            - baseline.memories_used
        ),
        additional_historical_patterns=additional_patterns,
        avoided_failed_actions=avoided_failed_actions,
        reasoning_changes=reasoning_changes,
    )

    comparison_payload = EvaluationCreate(
        organization_id=organization_id,
        incident_id=incident_id,
        mode="comparison",
        query=query,
    )

    comparison_result = EvaluationResult(
        mode="comparison",
        answer=(
            "Baseline and memory-assisted investigation comparison."
        ),
        root_cause=hindsight.root_cause,
        recommended_actions=hindsight.recommended_actions,
        successful_historical_patterns=(
            hindsight.successful_historical_patterns
        ),
        failed_historical_patterns=(
            hindsight.failed_historical_patterns
        ),
        warnings=hindsight.warnings,
        memories_used=hindsight.memories_used,
        confidence=hindsight.confidence,
        reasoning_metadata={
            "additional_memories_used": (
                comparison.additional_memories_used
            ),
            "reasoning_changes": comparison.reasoning_changes,
            "avoided_failed_actions": (
                comparison.avoided_failed_actions
            ),
            "memory_provider": memory_provider,
            "hindsight_available": hindsight_available,
            "historical_experience": (
                hindsight.reasoning_metadata.get(
                    "historical_experience",
                    [],
                )
                if hindsight.reasoning_metadata
                else []
            ),
            "root_cause_source": (
                hindsight.reasoning_metadata.get(
                    "root_cause_source",
                    "not_confirmed",
                )
                if hindsight.reasoning_metadata
                else "not_confirmed"
            ),
        },
    )

    _save_evaluation(
        db,
        payload=comparison_payload,
        result=comparison_result,
    )

    return comparison


def list_evaluations(
    db: Session,
    *,
    organization_id: str,
    incident_id: str | None = None,
) -> list[EvaluationRead]:
    """List persisted evaluations."""

    statement = select(Evaluation).where(
        Evaluation.organization_id == organization_id,
    )

    if incident_id:
        statement = statement.where(
            Evaluation.incident_id == incident_id,
        )

    statement = statement.order_by(
        Evaluation.created_at.desc(),
    )

    evaluations = db.execute(
        statement
    ).scalars().all()

    return [
        EvaluationRead.model_validate(item)
        for item in evaluations
    ]


def get_evaluation(
    db: Session,
    *,
    evaluation_id: str,
    organization_id: str,
) -> EvaluationRead:
    """Get one evaluation."""

    evaluation = db.execute(
        select(Evaluation).where(
            Evaluation.id == evaluation_id,
            Evaluation.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if evaluation is None:
        raise ValueError("Evaluation not found.")

    return EvaluationRead.model_validate(
        evaluation
    )


def get_evaluation_summary(
    db: Session,
    *,
    organization_id: str,
) -> EvaluationSummary:
    """
    Aggregate persisted evaluation metrics.

    The existing API field
    incidents_with_avoided_failed_actions is preserved for compatibility,
    but the value represents incidents where historical failed patterns
    were surfaced for avoidance.
    """

    evaluations = db.execute(
        select(Evaluation).where(
            Evaluation.organization_id == organization_id,
        )
    ).scalars().all()

    baseline_evaluations = [
        item
        for item in evaluations
        if item.mode == "baseline"
    ]

    hindsight_evaluations = [
        item
        for item in evaluations
        if item.mode == "hindsight"
    ]

    memory_values: list[float] = []

    for evaluation in hindsight_evaluations:
        if not evaluation.result:
            continue

        value = evaluation.result.get(
            "memories_used"
        )

        if isinstance(value, (int, float)):
            memory_values.append(
                float(value)
            )

    improved_reasoning = 0
    failed_patterns_surfaced = 0

    for evaluation in hindsight_evaluations:
        result = evaluation.result or {}

        if (
            result.get("memories_used", 0) > 0
            or result.get(
                "successful_historical_patterns"
            )
            or result.get("warnings")
        ):
            improved_reasoning += 1

        if result.get(
            "failed_historical_patterns"
        ):
            failed_patterns_surfaced += 1

    return EvaluationSummary(
        organization_id=organization_id,
        total_evaluations=len(evaluations),
        baseline_evaluations=len(baseline_evaluations),
        hindsight_evaluations=len(hindsight_evaluations),
        average_memories_used=(
            mean(memory_values)
            if memory_values
            else 0.0
        ),
        incidents_with_improved_reasoning=improved_reasoning,
        incidents_with_avoided_failed_actions=(
            failed_patterns_surfaced
        ),
    )


def _infer_root_cause(
    _reasoning: str,
    incident: Incident,
) -> str | None:
    """
    Return only a root cause explicitly recorded on the current incident.

    Historical/model reasoning must never be promoted to a confirmed
    current root cause.
    """

    root_cause = getattr(
        incident,
        "root_cause",
        None,
    )

    if not isinstance(root_cause, str):
        return None

    root_cause = root_cause.strip()

    return root_cause or None


def _difference(
    values: list[str],
    existing: list[str],
) -> list[str]:
    """Return unique values not already present."""

    existing_normalized = {
        " ".join(
            item.lower().split()
        )
        for item in existing
    }

    result: list[str] = []

    for value in values:
        normalized = " ".join(
            value.lower().split()
        )

        if normalized not in existing_normalized:
            result.append(value)

    return _deduplicate(result)


def _text_overlap(
    left: str,
    right: str,
) -> bool:
    left_words = {
        word.lower()
        for word in left.split()
        if len(word) >= 5
    }

    right_words = {
        word.lower()
        for word in right.split()
        if len(word) >= 5
    }

    return bool(
        left_words & right_words
    )


def _deduplicate(
    items: list[str],
) -> list[str]:
    seen = set()
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