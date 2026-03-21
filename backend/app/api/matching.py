"""
API endpoints for CV-JD Similarity Matching.

POST /api/matching/cv-jd - Compare candidate's CV with job description (from MongoDB)
POST /api/matching/cv-jd/pdf - Compare candidate's CV with job description (from PDF files)
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Request
from pydantic import BaseModel

from ..services.pdf_parser_service import get_pdf_parser_service
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
    import httpx
    from ..core.config import settings

    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    try:
        tin_url = settings.tin_endpoint.rstrip('/')
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Fetch Candidate & Job JSON data
            cand_resp = await client.get(f"{tin_url}/users/me/candidate-profile", headers=headers)
            job_resp = await client.get(f"{tin_url}/jobs/{request.jobId}", headers=headers)
            
            if cand_resp.status_code != 200 or job_resp.status_code != 200:
                raise HTTPException(status_code=404, detail="Candidate or Job not found")

            candidate = cand_resp.json().get("data", {})
            job = job_resp.json().get("data", {})

            # 2. Check if CV is already parsed. If NOT, download and parse now.
            parsed_cv = candidate.get("parsedCvData") or candidate.get("parsed_cv_data")
            
            if not parsed_cv:
                cv_path = candidate.get("cvUrl") or candidate.get("resumeUrl")
                # Download the PDF
                cv_file_resp = await client.get(f"{tin_url}/{cv_path.lstrip('/')}", headers=headers)
                
                # Verify it's not a JSON error
                if cv_file_resp.content.startswith(b'{"'):
                    raise ValueError(f"Server returned error instead of PDF: {cv_file_resp.text}")
                
                # Parse the PDF bytes to a dict
                pdf_parser = get_pdf_parser_service()
                parsed_cv = pdf_parser.parse_cv_from_file(cv_file_resp.content)
                logger.info("Successfully parsed CV on-the-fly.")

        # 3. Use the Matching Service
        service = get_matching_service()
        
        # We manually extract info because the JD is a string/JSON, 
        # but we use our fresh 'parsed_cv' for the candidate.
        candidate_info = service.extract_candidate_info({"parsedCvData": parsed_cv, **candidate})
        job_info = service.extract_job_info(job)

        # Call the LLM matching logic directly (or modify the service to accept dicts)
        # For now, let's assume we use the service's internal prompt logic
        result = service.compute_cv_jd_similarity(
            candidate_id=candidate.get("id"),
            job_id=request.jobId,
            token=token,
            pre_parsed_cv=parsed_cv
        )
        
        return result

    except Exception as e:
        logger.error(f"Hybrid Match Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cv-jd/pdf")
async def compute_cv_jd_match_from_pdfs(
    request: Request,
    cvFile: UploadFile = File(..., description="Candidate's CV as PDF"),
    jobFile: UploadFile = File(..., description="Job Description as PDF")
):
    """
    Compare candidate's CV PDF with job description PDF to compute match score.

    This endpoint accepts multipart/form-data with two PDF files.
    """
    try:
        content_type = request.headers.get("content-type", "unknown")
        logger.info(f"PDF endpoint called - Content-Type: {content_type}")
        logger.info(f"cvFile: {cvFile}, jobFile: {jobFile}")
        logger.info(f"cvFile filename: {cvFile.filename if cvFile else 'None'}")
        logger.info(f"jobFile filename: {jobFile.filename if jobFile else 'None'}")

        if not cvFile:
            raise HTTPException(status_code=400, detail="cvFile is required")
        if not jobFile:
            raise HTTPException(status_code=400, detail="jobFile is required")
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