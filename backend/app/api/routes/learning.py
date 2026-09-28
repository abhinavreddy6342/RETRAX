from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.postmortem import PostmortemLearning
from app.services.learning_service import (
    get_learning_status,
    learn_from_incident,
    rebuild_incident_learning,
)

router = APIRouter(
    prefix="/learning",
    tags=["Learning"],
)


@router.get(
    "/incidents/{incident_id}/status",
)
def get_learning_status_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> dict:
    try:
        return get_learning_status(
            db,
            incident_id=incident_id,
            organization_id=organization_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc


@router.post(
    "/incidents/{incident_id}",
    response_model=PostmortemLearning,
)
async def learn_from_incident_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> PostmortemLearning:
    try:
        return await learn_from_incident(
            db,
            incident_id=incident_id,
            organization_id=organization_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Incident learning failed: {exc}",
        ) from exc


@router.post(
    "/incidents/{incident_id}/rebuild",
    response_model=PostmortemLearning,
)
async def rebuild_learning_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> PostmortemLearning:
    try:
        return await rebuild_incident_learning(
            db,
            incident_id=incident_id,
            organization_id=organization_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Learning rebuild failed: {exc}",
        ) from exc