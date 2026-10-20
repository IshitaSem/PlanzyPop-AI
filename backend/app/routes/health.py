"""Health check endpoint route."""

from fastapi import APIRouter
from app.core.config import settings
from app.schemas.planner import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return backend health status and Gemini configuration status."""
    return HealthResponse(
        status="ok",
        app=settings.APP_NAME,
        tagline=settings.APP_TAGLINE,
        version=settings.APP_VERSION,
        gemini_configured=settings.is_gemini_configured,
        model=settings.GEMINI_MODEL,
    )
