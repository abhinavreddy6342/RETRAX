from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.models.incident import Incident
from app.db.session import get_db
from app.schemas.runbook import (
    RunbookCreate,
    RunbookExecutionRequest,
    RunbookExecutionResult,
    RunbookExperience,
    RunbookRead,
    RunbookRecommendation,
    RunbookUpdate,
)
from app.services.runbook_service import (
    create_runbook,
    delete_runbook,
    execute_runbook,
    get_runbook,
    get_runbook_experience,
    get_runbook_recommendations,
    list_runbooks,
    update_runbook,
)

router = APIRouter(
    prefix="/runbooks",
    tags=["Runbooks"],
)


@router.post(
    "",
    response_model=RunbookRead,
    status_code=status.HTTP_201_CREATED,
)
def create_runbook_route(
    payload: RunbookCreate,
    db: Session = Depends(get_db),
) -> RunbookRead:
    try:
        return create_runbook(
            db,
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=list[RunbookRead],
)
def list_runbooks_route(
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    service_id: str | None = Query(
        default=None,
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> list[RunbookRead]:
    return list_runbooks(
        db,
        organization_id=organization_id,
        service_id=service_id,
    )


@router.post(
    "/execute",
    response_model=RunbookExecutionResult,
)
async def execute_runbook_route(
    payload: RunbookExecutionRequest,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> RunbookExecutionResult:
    try:
        return await execute_runbook(
            db,
            incident_id=payload.incident_id,
            runbook_id=payload.runbook_id,
            organization_id=organization_id,
            actor=payload.actor,
            step_orders=payload.step_orders,
            notes=payload.notes,
        )
    except ValueError as exc:
        message = str(exc)

        if message in {
            "Incident not found.",
            "Runbook not found.",
        }:
            error_status = status.HTTP_404_NOT_FOUND
        else:
            error_status = status.HTTP_400_BAD_REQUEST

        raise HTTPException(
            status_code=error_status,
            detail=message,
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Runbook execution evaluation failed: {exc}",
        ) from exc


@router.get(
    "/recommendations/{incident_id}",
    response_model=list[RunbookRecommendation],
)
async def get_runbook_recommendations_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    service_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> list[RunbookRecommendation]:
    incident = (
        db.query(Incident)
        .filter(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
        .first()
    )

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    if incident.service_id != service_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incident does not belong to the requested service.",
        )

    try:
        return await get_runbook_recommendations(
            db,
            organization_id=organization_id,
            service_id=service_id,
            incident=incident,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Runbook recommendation failed: {exc}",
        ) from exc


@router.get(
    "/{runbook_id}",
    response_model=RunbookRead,
)
def get_runbook_route(
    runbook_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> RunbookRead:
    try:
        return get_runbook(
            db,
            runbook_id=runbook_id,
            organization_id=organization_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.patch(
    "/{runbook_id}",
    response_model=RunbookRead,
)
def update_runbook_route(
    runbook_id: str,
    payload: RunbookUpdate,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> RunbookRead:
    try:
        return update_runbook(
            db,
            runbook_id=runbook_id,
            organization_id=organization_id,
            payload=payload,
        )
    except ValueError as exc:
        message = str(exc)

        if message == "Runbook not found.":
            error_status = status.HTTP_404_NOT_FOUND
        else:
            error_status = status.HTTP_400_BAD_REQUEST

        raise HTTPException(
            status_code=error_status,
            detail=message,
        ) from exc


@router.delete(
    "/{runbook_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_runbook_route(
    runbook_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> None:
    try:
        delete_runbook(
            db,
            runbook_id=runbook_id,
            organization_id=organization_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/{runbook_id}/experience",
    response_model=RunbookExperience,
)
def get_runbook_experience_route(
    runbook_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> RunbookExperience:
    try:
        return get_runbook_experience(
            db,
            runbook_id=runbook_id,
            organization_id=organization_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc