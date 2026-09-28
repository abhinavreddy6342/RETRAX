from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.evaluation import (
    EvaluationComparison,
    EvaluationCreate,
    EvaluationRead,
    EvaluationSummary,
)
from app.services.evaluation_service import (
    compare_evaluations,
    get_evaluation,
    get_evaluation_summary,
    list_evaluations,
    run_evaluation,
)

router = APIRouter(
    prefix="/evaluations",
    tags=["Evaluations"],
)


@router.post(
    "",
    response_model=EvaluationRead,
)
async def run_evaluation_route(
    payload: EvaluationCreate,
    db: Session = Depends(get_db),
) -> EvaluationRead:
    try:
        return await run_evaluation(
            db,
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Evaluation failed: {exc}",
        ) from exc


@router.post(
    "/compare",
    response_model=EvaluationComparison,
)
async def compare_evaluations_route(
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    incident_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    query: str = Query(
        min_length=1,
    ),
    db: Session = Depends(get_db),
) -> EvaluationComparison:
    try:
        return await compare_evaluations(
            db,
            organization_id=organization_id,
            incident_id=incident_id,
            query=query,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Evaluation comparison failed: {exc}",
        ) from exc


@router.get(
    "",
    response_model=list[EvaluationRead],
)
def list_evaluations_route(
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    incident_id: str | None = Query(
        default=None,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> list[EvaluationRead]:
    return list_evaluations(
        db,
        organization_id=organization_id,
        incident_id=incident_id,
    )


@router.get(
    "/summary",
    response_model=EvaluationSummary,
)
def get_evaluation_summary_route(
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> EvaluationSummary:
    return get_evaluation_summary(
        db,
        organization_id=organization_id,
    )


@router.get(
    "/{evaluation_id}",
    response_model=EvaluationRead,
)
def get_evaluation_route(
    evaluation_id: str,
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    db: Session = Depends(get_db),
) -> EvaluationRead:
    try:
        return get_evaluation(
            db,
            evaluation_id=evaluation_id,
            organization_id=organization_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc