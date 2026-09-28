from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.evaluations import router as evaluations_router
from app.api.routes.incidents import router as incidents_router
from app.api.routes.investigations import router as investigations_router
from app.api.routes.learning import router as learning_router
from app.api.routes.memories import router as memories_router
from app.api.routes.postmortems import router as postmortems_router
from app.api.routes.runbooks import router as runbooks_router
from app.core.config import settings
from app.services.hindsight_service import hindsight_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage long-lived external clients for the FastAPI process."""
    yield
    await hindsight_service.client.aclose()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description=(
        "RETRAX — Memory-Augmented Incident Intelligence Platform. "
        "An AI incident-response system powered by Hindsight."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "0.1.0",
    }


app.include_router(
    incidents_router,
    prefix="/api",
)

app.include_router(
    investigations_router,
    prefix="/api",
)

app.include_router(
    runbooks_router,
    prefix="/api",
)

app.include_router(
    memories_router,
    prefix="/api",
)

app.include_router(
    postmortems_router,
    prefix="/api",
)

app.include_router(
    learning_router,
    prefix="/api",
)

app.include_router(
    evaluations_router,
    prefix="/api",
)
