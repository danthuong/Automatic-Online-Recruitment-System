"""
FastAPI application for the Automatic Online Recruitment System.
Includes AI Interviewer endpoints for candidate Q&A during exams.
"""
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_settings import BaseSettings

from .core.config import settings
from .api.repo_evaluation import router as repo_evaluation_router
from .api.github_profile import router as github_profile_router
from .api.matching import router as matching_router
from .api.question_gen import router as question_gen_router
from .services.llm_service import (
    get_llm_service,
    ChatMessage,
    MessageType,
    PROMPT_TEMPLATES,
    FALLBACK_RESPONSES
)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting AI Interviewer API...")
    logger.info(f"LLM Provider: {settings.llm_provider}")
    logger.info(f"Ollama Model: {settings.ollama_model}")
    yield
    logger.info("Shutting down AI Interviewer API...")


app = FastAPI(
    title="AI Interviewer API",
    description="REST API for the AI Interviewer feature in the Online Recruitment System",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Repo Evaluation router
app.include_router(repo_evaluation_router)

# Include GitHub Profile router
app.include_router(github_profile_router)

# Include Matching router
app.include_router(matching_router)

# Include Question Generation router
app.include_router(question_gen_router)


# Request/Response models
class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    question_id: str
    message: str
    context: dict  # Contains question_text, constraints, input_format, etc.
    conversation_history: Optional[List[dict]] = None  # [{"role": "user"|"assistant", "content": "..."}]
    attempt_history: Optional[List[dict]] = None  # Track hint requests, time spent, etc.


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    reply: str
    type: str  # "greeting", "hint", "clarification", "encouragement", "feedback", "general"
    suggested_time: Optional[int] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    llm_provider: str
    model: str


# Initialize conversation history storage (in production, use Redis/database)
conversation_store: dict = {}


@app.get("/", response_model=dict)
async def root():
    """Root endpoint."""
    return {
        "message": "AI Interviewer API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        llm_provider=settings.llm_provider,
        model=settings.ollama_model if settings.llm_provider == "ollama"
               else settings.openai_model if settings.llm_provider == "openai"
               else settings.anthropic_model
    )


@app.post("/api/interviewer/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat message from a candidate and return AI response.

    This endpoint:
    1. Classifies the message type (hint, clarification, encouragement, etc.)
    2. Builds context from the current question
    3. Calls the LLM to generate an appropriate response
    4. Returns the response with metadata
    """
    try:
        llm = get_llm_service()

        # Convert conversation history to ChatMessage objects
        history = []
        if request.conversation_history:
            for msg in request.conversation_history:
                history.append(ChatMessage(
                    role=msg.get("role", "user"),
                    content=msg.get("content", "")
                ))

        # Check if user is just saying hello/greeting
        user_message_lower = request.message.lower().strip()
        greeting_keywords = ['hello', 'hi', 'hey', 'start', 'ready', 'begin']

        # If this is the first message (no history) AND user is greeting, send greeting
        if not history and any(user_message_lower.startswith(kw) for kw in greeting_keywords):
            # Generate greeting
            greeting_template = PROMPT_TEMPLATES.get(MessageType.GREETING, "")
            greeting_prompt = greeting_template.format(
                question=request.context.get("question_text", "Unknown question"),
                difficulty=request.context.get("difficulty", "medium"),
                constraints=request.context.get("constraints", "No constraints"),
                input_format=request.context.get("input_format", "Not specified"),
                output_format=request.context.get("output_format", "Not specified"),
                examples=request.context.get("examples", []),
                user_message="",
                history=""
            )
            greeting_prompt = greeting_prompt.replace("{examples}", "")

            try:
                greeting = llm._generate_ollama(greeting_prompt, [])
            except Exception as e:
                logger.warning(f"Greeting generation failed: {e}")
                greeting = "Welcome to your coding interview! I'm here to help you throughout the session. Feel free to ask questions or request hints when needed."

            return ChatResponse(
                reply=greeting,
                type=MessageType.GREETING.value,
                suggested_time=None
            )

        # Process the actual chat message
        response = llm.chat(
            message=request.message,
            context=request.context,
            conversation_history=history
        )

        # Log for evaluation purposes
        logger.info(f"Chat request - question_id: {request.question_id}, type: {response.type.value}")

        return ChatResponse(
            reply=response.reply,
            type=response.type.value,
            suggested_time=response.suggested_time
        )

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        # Return fallback response instead of error
        return ChatResponse(
            reply=FALLBACK_RESPONSES.get("error"),
            type=MessageType.GENERAL.value,
            error=str(e)
        )


@app.post("/api/interviewer/hint")
async def request_hint(question_id: str, hint_level: int = 1, context: dict = None):
    """
    Request a progressive hint for the current question.

    Hint levels:
    - Level 1: General approach hint
    - Level 2: More specific direction
    - Level 3: Almost giving it away
    """
    try:
        llm = get_llm_service()

        if context is None:
            context = {}

        # Build hint prompt based on level
        hint_prompts = {
            1: "Provide a high-level hint about the general approach to solve this problem.",
            2: "Provide a more specific hint that points toward a particular algorithm or data structure.",
            3: "Provide a detailed hint that gets close to the solution but doesn't give it away completely."
        }

        prompt = f"""
Current problem: {context.get('question_text', 'Unknown')}
Difficulty: {context.get('difficulty', 'medium')}
Constraints: {context.get('constraints', 'None')}

{hint_prompts.get(hint_level, hint_prompts[1])}

Remember: Don't give the complete solution. Guide the candidate to discover it themselves.
"""

        # Use first message as history to simulate fresh context
        response = llm._generate_ollama(prompt, [])

        return ChatResponse(
            reply=response,
            type=MessageType.HINT.value,
            suggested_time=300  # 5 minutes suggested
        )

    except Exception as e:
        logger.error(f"Hint error: {e}")
        return ChatResponse(
            reply=FALLBACK_RESPONSES.get("hint"),
            type=MessageType.HINT.value,
            error=str(e)
        )


@app.get("/api/interviewer/history/{session_id}")
async def get_history(session_id: str):
    """Retrieve conversation history for a session."""
    return conversation_store.get(session_id, {"messages": []})


@app.post("/api/interviewer/history/{session_id}")
async def save_history(session_id: str, messages: List[dict]):
    """Save conversation history for a session."""
    conversation_store[session_id] = {"messages": messages}
    return {"status": "saved", "session_id": session_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)