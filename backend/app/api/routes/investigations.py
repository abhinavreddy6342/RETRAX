from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.agent.orchestrator import (
    incident_agent,
    investigate_incident,
)
from app.agent.schemas import (
    AgentChatRequest,
    AgentChatResponse,
    AgentInvestigationResponse,
    IncidentComparisonResponse,
)
from app.db.models.incident import Incident
from app.db.session import get_db
from app.schemas.investigation import (
    HypothesisCreate,
    HypothesisRead,
    HypothesisUpdate,
    InvestigationActionRead,
    InvestigationActionRequest,
    InvestigationSummary,
)
from app.services.investigation_service import (
    create_hypothesis,
    get_investigation_summary,
    list_hypotheses,
    record_investigation_action,
    remember_investigation_action,
    update_hypothesis,
)
from app.services.runbook_service import get_runbook_experience, list_runbooks


router = APIRouter(
    prefix="/investigations",
    tags=["Investigations"],
)


@router.post(
    "/incidents/{incident_id}/chat",
    response_model=AgentChatResponse,
)
async def chat_about_incident_route(
    incident_id: str,
    payload: AgentChatRequest,
    organization_id: str = Query(min_length=1, max_length=36),
    db: Session = Depends(get_db),
) -> AgentChatResponse:
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.organization_id == organization_id,
    ).first()
    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    summary = get_investigation_summary(
        db,
        incident_id=incident_id,
        organization_id=organization_id,
    )
    state_lines = [
        f"Recorded actions: {summary.total_actions}; successful: {summary.successful_actions}; failed: {summary.failed_actions}.",
    ]
    for action in summary.actions[-12:]:
        state_lines.append(
            f"Action ({action.result}) by {action.actor or 'actor not recorded'}: "
            f"{action.action}. Reason: {action.reason or 'not recorded'}. "
            f"Evidence: {', '.join(action.evidence or []) or 'not recorded'}."
        )
    for hypothesis in summary.hypotheses[-8:]:
        state_lines.append(
            f"Hypothesis ({hypothesis.status}, confidence {hypothesis.confidence:.0%}): "
            f"{hypothesis.name}. {hypothesis.description or ''}"
        )

    runbooks = list_runbooks(
        db,
        organization_id=organization_id,
        service_id=incident.service_id,
    )
    for runbook in runbooks[:5]:
        experience = get_runbook_experience(
            db,
            runbook_id=runbook.id,
            organization_id=organization_id,
        )
        outcome_summary = (
            f"{experience.executions} recorded executions, "
            f"{experience.success_rate:.0%} observed success rate"
            if experience.executions
            else "no recorded outcome history"
        )
        state_lines.append(
            f"Runbook {runbook.name} ({runbook.runbook_key}), risk {runbook.risk_level}; "
            f"{outcome_summary}; "
            f"known warnings: {'; '.join(experience.warnings) or 'none recorded'}."
        )

    try:
        return await incident_agent.chat(
            incident=incident,
            message=payload.message.strip(),
            history=[turn.model_dump() for turn in payload.history[-12:]],
            investigation_context="\n".join(state_lines),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Incident agent could not answer: {exc}",
        ) from exc


@router.post(
    "/incidents/{incident_id}",
    response_model=AgentInvestigationResponse,
)
async def investigate_incident_route(
    incident_id: str,
    organization_id: str = Query(min_length=1, max_length=36),
    db: Session = Depends(get_db),
) -> AgentInvestigationResponse:
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.organization_id == organization_id,
    ).first()

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    try:
        decision = await investigate_incident(incident)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Incident intelligence failed: {exc}",
        ) from exc

    return AgentInvestigationResponse(
        incident_id=decision.incident_id,
        summary=decision.summary,
        historical_experience=decision.historical_experience,
        reasoning=decision.reasoning,
        recommended_actions=decision.recommended_actions,
        successful_patterns=decision.successful_patterns,
        failed_patterns=decision.failed_patterns,
        warnings=decision.warnings,
        preventive_insights=decision.preventive_insights,
        confidence=decision.confidence,
        memory_count=decision.memory_count,
    )


@router.post(
    "/incidents/{incident_id}/comparison",
    response_model=IncidentComparisonResponse,
)
async def compare_incident_with_history_route(
    incident_id: str,
    organization_id: str = Query(min_length=1, max_length=36),
    db: Session = Depends(get_db),
) -> IncidentComparisonResponse:
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.organization_id == organization_id,
    ).first()

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    try:
        return await incident_agent.compare_with_history(
            incident=incident,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Incident comparison failed: {exc}",
        ) from exc


@router.post(
    "/incidents/{incident_id}/actions",
    response_model=InvestigationActionRead,
    status_code=status.HTTP_201_CREATED,
)
async def record_investigation_action_route(
    incident_id: str,
    payload: InvestigationActionRequest,
    organization_id: str = Query(min_length=1, max_length=36),
    db: Session = Depends(get_db),
) -> InvestigationActionRead:
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.organization_id == organization_id,
    ).first()

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    try:
        action = record_investigation_action(
            db,
            incident_id=incident_id,
            organization_id=organization_id,
            action=payload.action,
            result=payload.result,
            actor=payload.actor,
            reason=payload.reason,
            evidence=payload.evidence,
            runbook_id=payload.runbook_id,
            hypothesis_id=payload.hypothesis_id,
            timestamp=payload.timestamp,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    try:
        await remember_investigation_action(
            organization_id=organization_id,
            incident_id=incident_id,
            service_id=incident.service_id,
            action=payload.action,
            result=payload.result,
            actor=payload.actor,
            reason=payload.reason,
            evidence=payload.evidence,
            runbook_id=payload.runbook_id,
            hypothesis_id=payload.hypothesis_id,
            timestamp=payload.timestamp or action.timestamp,
        )
    except Exception:
        pass

    return action


@router.get(
    "/incidents/{incident_id}/trajectory",
    response_model=InvestigationSummary,
)
def get_investigation_trajectory_route(
    incident_id: str,
    organization_id: str = Query(min_length=1, max_length=36),
    db: Session = Depends(get_db),
) -> InvestigationSummary:
    try:
        return get_investigation_summary(
            db,
            incident_id=incident_id,
            organization_id=organization_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post(
    "/incidents/{incident_id}/hypotheses",
    response_model=HypothesisRead,
    status_code=status.HTTP_201_CREATED,
)
def create_hypothesis_route(
    incident_id: str,
    payload: HypothesisCreate,
    organization_id: str = Query(min_length=1, max_length=36),
    db: Session = Depends(get_db),
) -> HypothesisRead:
    try:
        return create_hypothesis(
            db,
            incident_id=incident_id,
            organization_id=organization_id,
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/incidents/{incident_id}/hypotheses",
    response_model=list[HypothesisRead],
)
def list_hypotheses_route(
    incident_id: str,
    organization_id: str = Query(min_length=1, max_length=36),
    db: Session = Depends(get_db),
) -> list[HypothesisRead]:
    try:
        return list_hypotheses(
            db,
            incident_id=incident_id,
            organization_id=organization_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.patch(
    "/incidents/{incident_id}/hypotheses/{hypothesis_id}",
    response_model=HypothesisRead,
)
def update_hypothesis_route(
    incident_id: str,
    hypothesis_id: str,
    payload: HypothesisUpdate,
    organization_id: str = Query(min_length=1, max_length=36),
    db: Session = Depends(get_db),
) -> HypothesisRead:
    try:
        return update_hypothesis(
            db,
            hypothesis_id=hypothesis_id,
            incident_id=incident_id,
            organization_id=organization_id,
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
