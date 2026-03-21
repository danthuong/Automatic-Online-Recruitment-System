"""
API endpoints for GitHub repository evaluation.

Provides endpoints to:
- Create new repository evaluations
- List all evaluations
- Get evaluation by ID
- Delete evaluations
"""
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import JSONResponse

from ..models.evaluations import (
    RepoEvaluation,
    EvaluationCreateRequest,
    EvaluationCreateResponse,
    EvaluationListResponse,
    EvaluationStatus,
)
from ..services.repo_evaluation_service import get_evaluation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])

# In-memory storage for evaluations (in production, use database)
# Format: {id: RepoEvaluation}
_evaluations_store: dict = {}


def run_evaluation_task(evaluation_id: str):
    """Background task to run repository evaluation."""
    evaluation = _evaluations_store.get(evaluation_id)
    if not evaluation:
        logger.error(f"Evaluation not found: {evaluation_id}")
        return

    try:
        service = get_evaluation_service()
        service.evaluate_repository(evaluation.repo_url, evaluation)
        logger.info(f"Evaluation completed: {evaluation_id}, status: {evaluation.status}")
    except Exception as e:
        logger.error(f"Evaluation task failed: {e}", exc_info=True)
        evaluation.status = EvaluationStatus.FAILED
        evaluation.error_message = str(e)


@router.post("", response_model=EvaluationCreateResponse)
async def create_evaluation(
    request: EvaluationCreateRequest,
    background_tasks: BackgroundTasks
):
    """
    Start a new repository evaluation.

    The evaluation runs in the background and status can be checked via GET endpoint.
    """
    # Validate URL
    repo_url = request.repo_url.strip()
    if not repo_url.startswith("https://github.com/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub URL. Must start with https://github.com/"
        )

    if repo_url.endswith("/"):
        repo_url = repo_url[:-1]

    # Create evaluation record
    evaluation = RepoEvaluation(repo_url=repo_url)
    _evaluations_store[evaluation.id] = evaluation

    # Start background task
    background_tasks.add_task(run_evaluation_task, evaluation.id)

    logger.info(f"Created evaluation: {evaluation.id} for {repo_url}")

    return EvaluationCreateResponse(
        id=evaluation.id,
        status=evaluation.status,
        message="Evaluation started. Use GET endpoint to check status."
    )


@router.get("", response_model=EvaluationListResponse)
async def list_evaluations(
    status: Optional[EvaluationStatus] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip")
):
    """
    List all repository evaluations.

    Optional filters:
    - status: Filter by evaluation status (pending, processing, completed, failed)
    - limit: Maximum number of results (default 50, max 100)
    - offset: Number of results to skip for pagination
    """
    evaluations = list(_evaluations_store.values())

    # Filter by status if provided
    if status:
        evaluations = [e for e in evaluations if e.status == status]

    # Sort by creation date (newest first)
    evaluations.sort(key=lambda e: e.created_at, reverse=True)

    # Apply pagination
    total = len(evaluations)
    evaluations = evaluations[offset:offset + limit]

    return EvaluationListResponse(
        evaluations=evaluations,
        total=total
    )


@router.get("/{evaluation_id}", response_model=RepoEvaluation)
async def get_evaluation(evaluation_id: str):
    """
    Get a specific evaluation by ID.

    Returns the full evaluation result including scores and feedback.
    """
    # Validate UUID format
    try:
        UUID(evaluation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid evaluation ID format")

    evaluation = _evaluations_store.get(evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    return evaluation


@router.delete("/{evaluation_id}")
async def delete_evaluation(evaluation_id: str):
    """
    Delete an evaluation by ID.
    """
    # Validate UUID format
    try:
        UUID(evaluation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid evaluation ID format")

    if evaluation_id not in _evaluations_store:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    del _evaluations_store[evaluation_id]

    return {"message": "Evaluation deleted successfully", "id": evaluation_id}


@router.get("/{evaluation_id}/status")
async def get_evaluation_status(evaluation_id: str):
    """
    Get just the status of an evaluation (lightweight endpoint).
    """
    try:
        UUID(evaluation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid evaluation ID format")

    evaluation = _evaluations_store.get(evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    return {
        "id": evaluation.id,
        "status": evaluation.status,
        "overall_score": evaluation.overall_score,
        "created_at": evaluation.created_at.isoformat(),
        "completed_at": evaluation.completed_at.isoformat() if evaluation.completed_at else None
    }