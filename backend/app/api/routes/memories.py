from __future__ import annotations

import inspect

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.memory import (
    MemoryCreate,
    MemoryRecallRequest,
    MemoryRecallResponse,
    MemoryReflectRequest,
    MemoryReflection,
)
from app.services import memory_service

router = APIRouter(
    prefix="/memories",
    tags=["Memory"],
)


async def _resolve(value):
    """Support both sync and async service implementations."""

    if inspect.isawaitable(value):
        return await value

    return value


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
async def create_memory_route(
    payload: MemoryCreate,
):
    try:
        return await _resolve(
            memory_service.create_memory(payload)
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post(
    "/recall",
    response_model=MemoryRecallResponse,
)
async def recall_memories_route(
    payload: MemoryRecallRequest,
) -> MemoryRecallResponse:
    try:
        return await _resolve(
            memory_service.recall_memories(payload)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Memory recall failed: {exc}",
        ) from exc


@router.post(
    "/reflect",
    response_model=MemoryReflection,
)
async def reflect_memories_route(
    payload: MemoryReflectRequest,
) -> MemoryReflection:
    try:
        return await _resolve(
            memory_service.reflect_memories(payload)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Memory reflection failed: {exc}",
        ) from exc


@router.post(
    "/incident-experience",
    response_model=MemoryRecallResponse,
)
async def recall_incident_experience_route(
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    query: str = Query(
        min_length=1,
    ),
    service_id: str | None = Query(
        default=None,
        max_length=36,
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
) -> MemoryRecallResponse:
    try:
        return await _resolve(
            memory_service.recall_incident_experience(
                organization_id=organization_id,
                query=query,
                service_id=service_id,
                limit=limit,
            )
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Incident experience recall failed: {exc}",
        ) from exc


@router.post(
    "/incident-reflection",
    response_model=MemoryReflection,
)
async def reflect_incident_experience_route(
    organization_id: str = Query(
        min_length=1,
        max_length=36,
    ),
    query: str = Query(
        min_length=1,
    ),
    service_id: str | None = Query(
        default=None,
        max_length=36,
    ),
    incident_id: str | None = Query(
        default=None,
        max_length=36,
    ),
) -> MemoryReflection:
    try:
        return await _resolve(
            memory_service.reflect_on_incident_experience(
                organization_id=organization_id,
                query=query,
                service_id=service_id,
                incident_id=incident_id,
            )
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Incident experience reflection failed: {exc}",
        ) from exc