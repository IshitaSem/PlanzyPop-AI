"""Event planning endpoint route."""

from fastapi import APIRouter, HTTPException, status
from app.schemas.planner import PlanRequest, PlanResponse
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api", tags=["Planner"])


@router.post("/plan", response_model=PlanResponse, status_code=status.HTTP_200_OK)
async def generate_plan(request: PlanRequest) -> PlanResponse:
    """Generate a structured celebration plan using Gemini AI with fallback support."""
    try:
        plan = await gemini_service.generate_plan(request)
        return plan
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Plan generation encountered an error: {str(exc)}",
        ) from exc
