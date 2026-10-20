"""Event assistant chat endpoint route."""

from fastapi import APIRouter, HTTPException, status
from app.schemas.planner import ChatRequest, ChatResponse
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_with_assistant(request: ChatRequest) -> ChatResponse:
    """Generate conversational celebration planning advice using Gemini."""
    try:
        reply = await gemini_service.generate_chat_reply(request)
        return reply
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat assistant encountered an error: {str(exc)}",
        ) from exc
