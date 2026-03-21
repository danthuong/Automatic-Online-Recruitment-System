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
    1. Fetches candidate's profile from Node.js API to get cvUrl
    2. Downloads the CV PDF from the cvUrl
    3. Extracts text from PDF
    4. Fetches job description
    5. Uses LLM to analyze the match and generate feedback
    6. Returns comprehensive match scores and analysis

    Request body:
        - candidateId: ID of the candidate (for job assignment, optional)
        - jobId: ID of the job

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
    import httpx
    from ..core.config import settings

    # Extract token from Authorization header
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    try:
        # Step 1: Fetch candidate profile from Node.js API
        tin_url = settings.tin_endpoint

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get candidate profile
            headers = {}
            if token:
                headers["Authorization"] = f"Bearer {token}"

            profile_resp = await client.get(
                f"{tin_url}/users/me/candidate-profile",
                headers=headers
            )

            if profile_resp.status_code == 401:
                raise HTTPException(status_code=401, detail="Unauthorized. Please login first.")

            if profile_resp.status_code != 200:
                raise HTTPException(
                    status_code=404,
                    detail=f"Candidate profile not found"
                )

            profile_data = profile_resp.json()
            candidate_profile = profile_data.get("data", {})

            # Get cvUrl from profile
            cv_url = candidate_profile.get("cvUrl")
            if not cv_url:
                raise HTTPException(
                    status_code=400,
                    detail="No CV found. Please upload your CV first."
                )

            # Step 2: Download CV PDF
            # cvUrl is like "files/some_thing_abcd", need to prepend tin_url
            if cv_url.startswith("http"):
                cv_download_url = cv_url
            else:
                cv_download_url = f"{tin_url}/{cv_url}"

            cv_resp = await client.get(cv_download_url, headers=headers)
            if cv_resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to download CV file")

            cv_content = cv_resp.content

            # Get job description if jobId provided
            job_description = None
            if request.jobId:
                job_resp = await client.get(
                    f"{tin_url}/jobs/{request.jobId}",
                    headers=headers
                )
                if job_resp.status_code == 200:
                    job_data = job_resp.json()
                    job_info = job_data.get("data", {})
                    job_description = job_info.get("description", "")

            if not job_description:
                job_description = "Software Engineer position"

        # Step 3: Compute similarity using matching service
        service = get_matching_service()
        result = service.compute_cv_jd_from_pdfs(cv_content, job_description.encode())

        # Add candidate info to result
        result["candidateId"] = request.candidateId
        result["jobId"] = request.jobId
        result["candidateName"] = candidate_profile.get("user", {}).get("firstName", "Unknown")

        logger.info(f"CV-JD matching completed for candidate {request.candidateId}, job {request.jobId}: score={result['overallScore']}")

        return result

    except HTTPException:
        raise
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
            detail=f"Service unavailable: {str(e)}"
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