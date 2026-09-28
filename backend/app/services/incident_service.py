from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.db.models.deployment import Deployment
from app.db.models.incident import Incident
from app.db.models.service import Service
from app.db.models.user import User
from app.schemas.incident import (
    IncidentCreate,
    IncidentListItem,
    IncidentListResponse,
    IncidentRead,
    IncidentUpdate,
)


def create_incident(
    db: Session,
    payload: IncidentCreate,
) -> IncidentRead:
    """Create an incident after validating tenant and service ownership."""

    service = db.scalar(
        select(Service).where(
            Service.id == payload.service_id,
            Service.organization_id == payload.organization_id,
        )
    )

    if service is None:
        raise ValueError(
            "Service does not exist or does not belong to the organization."
        )

    if payload.assigned_to:
        user = db.scalar(
            select(User).where(
                User.id == payload.assigned_to,
                User.organization_id == payload.organization_id,
            )
        )

        if user is None:
            raise ValueError(
                "Assigned user does not exist or does not belong to the organization."
            )

    if payload.deployment_id:
        deployment = db.scalar(
            select(Deployment)
            .join(Service, Deployment.service_id == Service.id)
            .where(
                Deployment.id == payload.deployment_id,
                Deployment.service_id == payload.service_id,
                Service.organization_id == payload.organization_id,
            )
        )

        if deployment is None:
            raise ValueError(
                "Deployment does not exist or does not belong to the selected service."
            )

    existing = db.scalar(
        select(Incident).where(
            Incident.incident_key == payload.incident_key,
        )
    )

    if existing is not None:
        raise ValueError(
            f"Incident with key '{payload.incident_key}' already exists."
        )

    incident = Incident(
        id=str(uuid4()),
        incident_key=payload.incident_key,
        organization_id=payload.organization_id,
        service_id=payload.service_id,
        assigned_to=payload.assigned_to,
        deployment_id=payload.deployment_id,
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        status=payload.status,
        environment=payload.environment,
        current_error=payload.current_error,
        impact=payload.impact,
        started_at=payload.started_at,
        detected_at=payload.detected_at,
        created_at=utcnow(),
        updated_at=utcnow(),
    )

    db.add(incident)

    try:
        db.commit()
        db.refresh(incident)
    except Exception:
        db.rollback()
        raise

    return IncidentRead.model_validate(incident)


def get_incident(
    db: Session,
    incident_id: str,
    organization_id: str | None = None,
) -> IncidentRead | None:
    """Fetch one incident, optionally scoped to an organization."""

    stmt = select(Incident).where(
        Incident.id == incident_id,
    )

    if organization_id:
        stmt = stmt.where(
            Incident.organization_id == organization_id,
        )

    incident = db.scalar(stmt)

    if incident is None:
        return None

    return IncidentRead.model_validate(incident)


def get_incident_by_key(
    db: Session,
    incident_key: str,
    organization_id: str | None = None,
) -> IncidentRead | None:
    """Fetch an incident by its external incident key."""

    stmt = select(Incident).where(
        Incident.incident_key == incident_key,
    )

    if organization_id:
        stmt = stmt.where(
            Incident.organization_id == organization_id,
        )

    incident = db.scalar(stmt)

    if incident is None:
        return None

    return IncidentRead.model_validate(incident)


def list_incidents(
    db: Session,
    organization_id: str,
    *,
    status: str | None = None,
    severity: str | None = None,
    service_id: str | None = None,
    environment: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> IncidentListResponse:
    """Return filtered incidents for an organization."""

    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    filters: list[Any] = [
        Incident.organization_id == organization_id,
    ]

    if status:
        filters.append(Incident.status == status)

    if severity:
        filters.append(Incident.severity == severity)

    if service_id:
        filters.append(Incident.service_id == service_id)

    if environment:
        filters.append(Incident.environment == environment)

    total = db.scalar(
        select(func.count(Incident.id)).where(*filters)
    ) or 0

    incidents = db.scalars(
        select(Incident)
        .where(*filters)
        .order_by(Incident.started_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    items = [
        IncidentListItem.model_validate(incident)
        for incident in incidents
    ]

    return IncidentListResponse(
        items=items,
        total=int(total),
    )


def update_incident(
    db: Session,
    incident_id: str,
    organization_id: str,
    payload: IncidentUpdate,
) -> IncidentRead | None:
    """Update an incident within the organization boundary."""

    incident = db.scalar(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    )

    if incident is None:
        return None

    update_data = payload.model_dump(exclude_unset=True)

    if "assigned_to" in update_data and update_data["assigned_to"]:
        user = db.scalar(
            select(User).where(
                User.id == update_data["assigned_to"],
                User.organization_id == organization_id,
            )
        )

        if user is None:
            raise ValueError(
                "Assigned user does not exist or does not belong to the organization."
            )

    if "deployment_id" in update_data and update_data["deployment_id"]:
        deployment = db.scalar(
            select(Deployment)
            .join(Service, Deployment.service_id == Service.id)
            .where(
                Deployment.id == update_data["deployment_id"],
                Deployment.service_id == incident.service_id,
                Service.organization_id == organization_id,
            )
        )

        if deployment is None:
            raise ValueError(
                "Deployment does not exist or does not belong to the incident service."
            )

    for field, value in update_data.items():
        setattr(incident, field, value)

    incident.updated_at = utcnow()

    if incident.status.lower() in {
        "resolved",
        "closed",
    } and incident.resolved_at is None:
        incident.resolved_at = utcnow()

    try:
        db.commit()
        db.refresh(incident)
    except Exception:
        db.rollback()
        raise

    return IncidentRead.model_validate(incident)


def resolve_incident(
    db: Session,
    incident_id: str,
    organization_id: str,
    *,
    root_cause: str,
    resolution_summary: str,
    resolved_by: str | None = None,
) -> IncidentRead | None:
    """Mark an incident resolved and record the confirmed resolution summary."""

    incident = db.scalar(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    )

    if incident is None:
        return None

    if not root_cause.strip():
        raise ValueError("Root cause cannot be empty.")

    if not resolution_summary.strip():
        raise ValueError("Resolution summary cannot be empty.")

    if resolved_by:
        user = db.scalar(
            select(User).where(
                User.id == resolved_by,
                User.organization_id == organization_id,
            )
        )

        if user is None:
            raise ValueError(
                "Resolving user does not exist or does not belong to the organization."
            )

    incident.root_cause = root_cause.strip()
    incident.resolution_summary = resolution_summary.strip()
    incident.status = "resolved"
    incident.resolved_at = utcnow()
    incident.updated_at = utcnow()

    try:
        db.commit()
        db.refresh(incident)
    except Exception:
        db.rollback()
        raise

    return IncidentRead.model_validate(incident)


def reopen_incident(
    db: Session,
    incident_id: str,
    organization_id: str,
) -> IncidentRead | None:
    """Reopen a previously resolved incident."""

    incident = db.scalar(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    )

    if incident is None:
        return None

    incident.status = "investigating"
    incident.resolved_at = None
    incident.updated_at = utcnow()

    try:
        db.commit()
        db.refresh(incident)
    except Exception:
        db.rollback()
        raise

    return IncidentRead.model_validate(incident)


def delete_incident(
    db: Session,
    incident_id: str,
    organization_id: str,
) -> bool:
    """Delete an incident scoped to its organization."""

    incident = db.scalar(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    )

    if incident is None:
        return False

    try:
        db.delete(incident)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return True