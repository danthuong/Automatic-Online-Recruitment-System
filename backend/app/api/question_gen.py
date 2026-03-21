"""
API endpoints for Dynamic Interview Question Generation.

POST /api/questions/generate - Generate 5 interview questions based on candidate's CV (from MongoDB)
POST /api/questions/generate/pdf - Generate 5 interview questions based on CV PDF
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel

from ..services.question_generation_service import get_question_generation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/questions", tags=["questions"])


class QuestionGenerationRequest(BaseModel):
    """Request body for question generation endpoint."""
    candidateId: str
    jobId: Optional[str] = None


class QuestionGenerationResponse(BaseModel):
    """Response from question generation endpoint."""
    questions: list
    generatedAt: str


@router.post("/generate")
async def generate_questions(
    request: QuestionGenerationRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Generate 5 interview questions based on candidate's CV.

    This endpoint:
    1. Fetches candidate's parsed CV data from Node.js API
    2. Extracts coding skills and experience
    3. Generates 3 coding questions (2 easy + 1 medium)
    4. Generates 2 essay questions based on experience
    5. Saves questions to MongoDB

    Request body:
        - candidateId: MongoDB ObjectId of the candidate (required)
        - jobId: MongoDB ObjectId of the job (optional, for additional context)

    Returns:
        - questions: Array of 5 question objects
          - 3 coding questions (2 easy, 1 medium) with starterCode
          - 2 essay questions about projects/experience
        - generatedAt: ISO timestamp of generation time
    """
    # Extract token from Authorization header
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    try:
        service = get_question_generation_service()

        result = service.generate_interview_questions(
            candidate_id=request.candidateId,
            job_id=request.jobId,
            token=token
        )

        question_count = len(result.get("questions", []))
        logger.info(f"Generated {question_count} questions for candidate {request.candidateId}")

        return result

    except ValueError as e:
        error_msg = str(e)
        if "CV not parsed" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="CV not parsed. Please upload and parse CV first."
            )
        elif "Candidate not found" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Candidate not found: {request.candidateId}"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )

    except Exception as e:
        logger.error(f"Question generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Service unavailable. Please try again later."
        )


@router.post("/generate/pdf")
async def generate_questions_from_pdf(
    cvFile: UploadFile = File(..., description="Candidate's CV as PDF")
):
    """
    Generate 5 interview questions based on candidate's CV PDF.

    This endpoint:
    1. Accepts CV PDF file
    2. Extracts text using pypdf
    3. Uses LLM to parse structured CV data (skills, experience, projects)
    4. Generates 3 coding questions (2 easy + 1 medium) based on skills
    5. Generates 2 essay questions based on experience/projects
    6. Returns generated questions

    Request:
        - cvFile: PDF file of candidate's CV

    Returns:
        - questions: Array of 5 question objects
          - 3 coding questions (2 easy, 1 medium) with starterCode
          - 2 essay questions about projects/experience
        - generatedAt: ISO timestamp of generation time
        - parsedCV: Extracted CV data
    """
    try:
        # Validate file type
        if not cvFile.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="CV file must be a PDF")

        # Read file content
        cv_content = await cvFile.read()

        logger.info(f"Received CV PDF: {cvFile.filename} ({len(cv_content)} bytes)")

        # Generate questions
        service = get_question_generation_service()
        result = service.generate_interview_questions_from_pdf(cv_content)

        question_count = len(result.get("questions", []))
        logger.info(f"Generated {question_count} questions from PDF")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF-based question generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Failed to generate questions from PDF. Please try again later."
        )


@router.get("/health")
async def question_gen_health():
    """Health check for question generation service."""
    return {"status": "healthy", "service": "question_generation"}