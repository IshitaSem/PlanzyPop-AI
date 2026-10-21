"""Event planning endpoint route."""

import logging
from fastapi import APIRouter, HTTPException, Request, status
from app.core.rate_limiter import rate_limiter
from app.schemas.planner import PlanRequest, PlanResponse
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Planner"])


@router.post("/plan", response_model=PlanResponse, status_code=status.HTTP_200_OK)
async def generate_plan(request: PlanRequest, raw_request: Request) -> PlanResponse:
    """Generate a structured celebration plan using Gemini AI with fallback support."""
    # Apply rate limiting to prevent API exhaustion
    rate_limiter.check(raw_request)

    try:
        plan = await gemini_service.generate_plan(request)
        return plan
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error in plan generation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating the celebration plan. Please try again later.",
        ) from exc
