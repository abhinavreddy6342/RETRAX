from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.postmortem import (
    PostmortemCreate,
    PostmortemLearning,
    PostmortemRead,
    PostmortemUpdate,
)
from app.services.postmortem_service import (
    create_postmortem,
    delete_postmortem,
    get_postmortem,
    learn_from_postmortem,
    update_postmortem,
)

router = APIRouter(
    prefix="/postmortems",
    tags=["Postmortems"],
)


@router.post(
    "",
    response_model=PostmortemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_postmortem_route(
    payload: PostmortemCreate,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> PostmortemRead:
    try:
        return create_postmortem(
            db,
            organization_id=organization_id,
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/incidents/{incident_id}",
    response_model=PostmortemRead,
)
def get_postmortem_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> PostmortemRead:
    try:
        return get_postmortem(
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
    "/incidents/{incident_id}",
    response_model=PostmortemRead,
)
def update_postmortem_route(
    incident_id: str,
    payload: PostmortemUpdate,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> PostmortemRead:
    try:
        return update_postmortem(
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


@router.delete(
    "/incidents/{incident_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_postmortem_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> None:
    try:
        delete_postmortem(
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
    "/incidents/{incident_id}/learn",
    response_model=PostmortemLearning,
)
async def learn_from_postmortem_route(
    incident_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> PostmortemLearning:
    try:
        return await learn_from_postmortem(
            db,
            incident_id=incident_id,
            organization_id=organization_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Postmortem learning failed: {exc}",
        ) from exc