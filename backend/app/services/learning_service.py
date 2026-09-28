from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.incident import Incident
from app.db.models.postmortem import Postmortem
from app.schemas.postmortem import PostmortemLearning
from app.services.postmortem_service import learn_from_postmortem


async def learn_from_incident(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
) -> PostmortemLearning:
    """
    Complete the incident learning loop from its postmortem.
    """

    incident = db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if incident is None:
        raise ValueError("Incident not found.")

    postmortem = db.execute(
        select(Postmortem.id).where(
            Postmortem.incident_id == incident_id,
        )
    ).scalar_one_or_none()

    if postmortem is None:
        raise ValueError(
            "Postmortem is required before learning can be extracted."
        )

    return await learn_from_postmortem(
        db,
        incident_id=incident_id,
        organization_id=organization_id,
    )


async def rebuild_incident_learning(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
) -> PostmortemLearning:
    """Re-run learning extraction for an existing postmortem."""

    return await learn_from_incident(
        db,
        incident_id=incident_id,
        organization_id=organization_id,
    )


def get_learning_status(
    db: Session,
    *,
    incident_id: str,
    organization_id: str,
) -> dict:
    """Return whether an incident has enough data for durable learning."""

    incident = db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if incident is None:
        raise ValueError("Incident not found.")

    postmortem = db.execute(
        select(Postmortem).where(
            Postmortem.incident_id == incident_id,
        )
    ).scalar_one_or_none()

    if postmortem is None:
        return {
            "incident_id": incident_id,
            "ready": False,
            "reason": "Postmortem has not been created.",
            "postmortem_created": False,
            "has_root_cause": False,
            "has_successful_actions": False,
            "has_failed_actions": False,
            "has_lessons": False,
            "has_preventive_actions": False,
        }

    return {
        "incident_id": incident_id,
        "ready": True,
        "reason": "Postmortem is available for durable learning.",
        "postmortem_created": True,
        "has_root_cause": bool(postmortem.root_cause),
        "has_successful_actions": bool(
            postmortem.successful_actions
        ),
        "has_failed_actions": bool(
            postmortem.failed_actions
        ),
        "has_lessons": bool(
            postmortem.lessons_learned
        ),
        "has_preventive_actions": bool(
            postmortem.preventive_actions
        ),
        "created_at": (
            postmortem.created_at.isoformat()
            if postmortem.created_at
            else datetime.now(timezone.utc).isoformat()
        ),
    }
    