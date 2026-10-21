"""Event assistant chat endpoint route."""

import logging
from fastapi import APIRouter, HTTPException, Request, status
from app.core.rate_limiter import rate_limiter
from app.schemas.planner import ChatRequest, ChatResponse
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_with_assistant(request: ChatRequest, raw_request: Request) -> ChatResponse:
    """Generate conversational celebration planning advice using Gemini."""
    # Apply rate limiting to protect chat assistant from abuse
    rate_limiter.check(raw_request)

    try:
        reply = await gemini_service.generate_chat_reply(request)
        return reply
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error in chat assistant: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while communicating with the celebration assistant. Please try again later.",
        ) from exc
