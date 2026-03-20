"""
Interviewer API endpoints.
Provides REST API for AI-powered interview assistance.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.llm_service import (
    get_llm_service,
    ChatMessage,
    MessageType,
    PROMPT_TEMPLATES,
    FALLBACK_RESPONSES
)

router = APIRouter(prefix="/api/interviewer", tags=["interviewer"])


# Request/Response models
class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    question_id: str
    message: str
    context: dict  # Contains question_text, constraints, input_format, etc.
    conversation_history: Optional[List[dict]] = None
    attempt_history: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    reply: str
    type: str
    suggested_time: Optional[int] = None
    error: Optional[str] = None


class HintRequest(BaseModel):
    """Request for a hint."""
    question_id: str
    hint_level: int = 1
    context: dict


class EvaluationData(BaseModel):
    """Evaluation metrics for candidate."""
    question_id: str
    clarification_count: int
    time_to_first_hint: int
    question_types: List[str]
    hint_dependency_level: int


@router.post("/chat", response_model=ChatRequest)
async def chat(request: ChatRequest):
    """
    Process a chat message from a candidate.
    """
    from ..main import chat as main_chat
    return await main_chat(request)


@router.post("/hint", response_model=ChatResponse)
async def request_hint(request: HintRequest):
    """
    Request a progressive hint for the current question.
    """
    from ..main import request_hint as main_hint
    return await main_hint(
        question_id=request.question_id,
        hint_level=request.hint_level,
        context=request.context
    )


@router.post("/evaluate")
async def submit_evaluation(data: EvaluationData):
    """
    Submit evaluation data from the exam session.
    Used for HR reporting on candidate performance.
    """
    # In production, store to database
    return {
        "status": "received",
        "question_id": data.question_id,
        "metrics": {
            "clarification_questions": data.clarification_count,
            "time_to_first_hint_seconds": data.time_to_first_hint,
            "question_types": data.question_types,
            "hint_dependency": data.hint_dependency_level
        }
    }


@router.get("/ping")
async def ping():
    """Simple ping endpoint for connectivity check."""
    return {"status": "ok", "service": "interviewer"}