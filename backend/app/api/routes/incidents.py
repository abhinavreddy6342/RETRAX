from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.models.incident import Incident
from app.db.session import get_db
from app.schemas.incident import (
    IncidentCreate,
    IncidentListResponse,
    IncidentRead,
    IncidentUpdate,
)
from app.schemas.memory import MemoryRecallResponse
from app.services.hindsight_service import recall_similar_incidents
from app.services.incident_service import (
    create_incident,
    delete_incident,
    get_incident,
    get_incident_by_key,
    list_incidents,
    reopen_incident,
    resolve_incident,
    update_incident,
)
from app.services.memory_service import remember_incident_resolution


router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"],
)


class ResolveIncidentRequest(BaseModel):
    """Finalize an incident and optionally trigger memory learning."""

    root_cause: str = Field(
        min_length=1,
    )

    resolution_summary: str = Field(
        min_length=1,
    )

    resolved_by: str | None = Field(
        default=None,
        max_length=150,
    )

    successful_actions: list[str] = Field(
        default_factory=list,
    )

    failed_actions: list[str] = Field(
        default_factory=list,
    )

    lessons: list[str] = Field(
        default_factory=list,
    )

    preventive_actions: list[str] = Field(
        default_factory=list,
    )

    resolved_at: datetime | None = None


@router.post(
    "",
    response_model=IncidentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_incident_route(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
) -> IncidentRead:
    try:
        return create_incident(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=IncidentListResponse,
)
def list_incidents_route(
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    severity: str | None = None,
    service_id: str | None = None,
    environment: str | None = None,
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    db: Session = Depends(get_db),
) -> IncidentListResponse:
    return list_incidents(
        db,
        organization_id,
        status=status_filter,
        severity=severity,
        service_id=service_id,
        environment=environment,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/key/{incident_key}",
    response_model=IncidentRead,
)
def get_incident_by_key_route(
    incident_key: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> IncidentRead:
    incident = get_incident_by_key(
        db,
        incident_key,
        organization_id,
    )

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    return incident


@router.get(
    "/{incident_id}",
    response_model=IncidentRead,
)
def get_incident_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> IncidentRead:
    incident = get_incident(
        db,
        incident_id,
        organization_id,
    )

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    return incident


@router.patch(
    "/{incident_id}",
    response_model=IncidentRead,
)
def update_incident_route(
    incident_id: str,
    payload: IncidentUpdate,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> IncidentRead:
    try:
        incident = update_incident(
            db,
            incident_id,
            organization_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    return incident


@router.post(
    "/{incident_id}/resolve",
    response_model=IncidentRead,
)
async def resolve_incident_route(
    incident_id: str,
    payload: ResolveIncidentRequest,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> IncidentRead:
    try:
        incident = resolve_incident(
            db,
            incident_id,
            organization_id,
            root_cause=payload.root_cause,
            resolution_summary=payload.resolution_summary,
            resolved_by=payload.resolved_by,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    db_incident = db.get(Incident, incident_id)

    if db_incident is not None:
        try:
            await remember_incident_resolution(
                organization_id=organization_id,
                incident_id=incident.id,
                service_id=incident.service_id,
                incident_key=incident.incident_key,
                title=incident.title,
                description=incident.description,
                root_cause=payload.root_cause,
                successful_actions=payload.successful_actions,
                failed_actions=payload.failed_actions,
                lessons=payload.lessons,
                preventive_actions=payload.preventive_actions,
                timestamp=payload.resolved_at or incident.resolved_at,
            )
        except Exception:
            # Incident resolution must remain successful even when
            # external memory infrastructure is temporarily unavailable.
            pass

    return incident


@router.post(
    "/{incident_id}/reopen",
    response_model=IncidentRead,
)
def reopen_incident_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> IncidentRead:
    incident = reopen_incident(
        db,
        incident_id,
        organization_id,
    )

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    return incident


@router.post(
    "/{incident_id}/memory/recall",
    response_model=MemoryRecallResponse,
)
async def recall_incident_memory_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=20,
    ),
    db: Session = Depends(get_db),
) -> MemoryRecallResponse:
    incident = get_incident(
        db,
        incident_id,
        organization_id,
    )

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    query = (
        f"Incident: {incident.title}\n"
        f"Description: {incident.description}\n"
        f"Current error: {incident.current_error or 'None'}\n"
        f"Impact: {incident.impact or 'None'}\n"
        f"Environment: {incident.environment}\n"
        f"Severity: {incident.severity}"
    )

    try:
        response = await recall_similar_incidents(
            query=query,
            organization_id=organization_id,
            service_id=incident.service_id,
            limit=limit,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Hindsight memory recall failed: {exc}",
        ) from exc

    return MemoryRecallResponse(
        query=response.get("query", query),
        items=[
            {
                "content": item.get("text", ""),
                "memory_type": item.get("type"),
                "memory_id": item.get("id"),
                "relevance": item.get("score"),
                "incident_id": None,
                "service_id": incident.service_id,
            }
            for item in response.get("results", [])
        ],
        total=len(response.get("results", [])),
    )


@router.delete(
    "/{incident_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_incident_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> None:
    deleted = delete_incident(
        db,
        incident_id,
        organization_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )