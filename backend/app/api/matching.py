"""
API endpoints for CV-JD Similarity Matching.

POST /api/matching/cv-jd - Compare candidate's CV with job description (from MongoDB)
POST /api/matching/cv-jd/pdf - Compare candidate's CV with job description (from PDF files)
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel

from ..services.matching_service import get_matching_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/matching", tags=["matching"])


class CVJDMatchingRequest(BaseModel):
    """Request body for CV-JD matching endpoint."""
    candidateId: str
    jobId: str


class CVJDMatchingResponse(BaseModel):
    """Response from CV-JD matching endpoint."""
    candidateId: str
    jobId: str
    candidateName: str
    jobTitle: str
    overallScore: int
    skillMatchScore: int
    experienceMatchScore: int
    educationMatchScore: int
    skillGaps: list
    strengths: list
    matchedPreferredSkills: list
    llmFeedback: str


@router.post("/cv-jd")
async def compute_cv_jd_match(
    request: CVJDMatchingRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Compare candidate's CV with job description to compute match score.

    This endpoint:
    1. Fetches candidate's parsed CV data from Node.js API
    2. Fetches job description and requirements
    3. Uses LLM to analyze the match and generate feedback
    4. Returns comprehensive match scores and analysis

    Request body:
        - candidateId: MongoDB ObjectId of the candidate
        - jobId: MongoDB ObjectId of the job

    Returns:
        - overallScore: Weighted average of all match scores (0-100)
        - skillMatchScore: How well candidate's skills match required skills
        - experienceMatchScore: How well experience matches job level
        - educationMatchScore: How well education matches requirements
        - skillGaps: Skills required by job that candidate lacks
        - strengths: Skills candidate has that match job requirements
        - matchedPreferredSkills: Preferred skills candidate possesses
        - llmFeedback: LLM-generated summary of the match
    """
    # Extract token from Authorization header
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    try:
        service = get_matching_service()

        result = service.compute_cv_jd_similarity(
            candidate_id=request.candidateId,
            job_id=request.jobId,
            token=token
        )

        logger.info(f"CV-JD matching completed for candidate {request.candidateId}, job {request.jobId}: score={result['overallScore']}")

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
        elif "Job not found" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Job not found: {request.jobId}"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )

    except Exception as e:
        logger.error(f"CV-JD matching error: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Service unavailable. Please try again later."
        )


@router.post("/cv-jd/pdf")
async def compute_cv_jd_match_from_pdfs(
    cvFile: UploadFile = File(..., description="Candidate's CV as PDF"),
    jobFile: UploadFile = File(..., description="Job Description as PDF")
):
    """
    Compare candidate's CV PDF with job description PDF to compute match score.

    This endpoint:
    1. Accepts CV PDF file and Job Description PDF file
    2. Extracts text from both PDFs using pypdf
    3. Uses LLM to parse structured data (skills, experience, etc.)
    4. Uses LLM to analyze the match and generate feedback
    5. Returns comprehensive match scores and analysis

    Request:
        - cvFile: PDF file of candidate's CV
        - jobFile: PDF file of job description

    Returns:
        - overallScore: Weighted average of all match scores (0-100)
        - skillMatchScore: How well candidate's skills match required skills
        - experienceMatchScore: How well experience matches job level
        - educationMatchScore: How well education matches requirements
        - skillGaps: Skills required by job that candidate lacks
        - strengths: Skills candidate has that match job requirements
        - matchedPreferredSkills: Preferred skills candidate possesses
        - llmFeedback: LLM-generated summary of the match
        - parsedCV: Extracted CV data (name, skills, experience, etc.)
        - parsedJob: Extracted job data (title, required skills, etc.)
    """
    try:
        # Validate file types
        if not cvFile.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="CV file must be a PDF")
        if not jobFile.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Job description file must be a PDF")

        # Read file contents
        cv_content = await cvFile.read()
        job_content = await jobFile.read()

        logger.info(f"Received CV PDF: {cvFile.filename} ({len(cv_content)} bytes)")
        logger.info(f"Received JD PDF: {jobFile.filename} ({len(job_content)} bytes)")

        # Compute similarity
        service = get_matching_service()
        result = service.compute_cv_jd_from_pdfs(cv_content, job_content)

        logger.info(f"PDF-based CV-JD matching completed: score={result['overallScore']}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF-based CV-JD matching error: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Failed to process PDFs. Please try again later."
        )


@router.get("/health")
async def matching_health():
    """Health check for matching service."""
    return {"status": "healthy", "service": "matching"}