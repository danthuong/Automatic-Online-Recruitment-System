"""
Data models for GitHub repository evaluations.
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field


class EvaluationStatus(str, Enum):
    """Status of a repository evaluation."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RepoEvaluation(BaseModel):
    """Model for GitHub repository evaluation results."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    repo_url: str
    status: EvaluationStatus = EvaluationStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    # Scores (0-100)
    code_quality_score: Optional[float] = None
    documentation_score: Optional[float] = None
    best_practices_score: Optional[float] = None
    tech_stack_score: Optional[float] = None
    testing_score: Optional[float] = None
    security_score: Optional[float] = None
    architecture_score: Optional[float] = None
    overall_score: Optional[float] = None

    # Detailed feedback
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    tech_stack_detected: List[str] = Field(default_factory=list)
    evaluation_details: Dict[str, Any] = Field(default_factory=dict)

    # Error message if failed
    error_message: Optional[str] = None


class EvaluationCreateRequest(BaseModel):
    """Request to create a new evaluation."""
    repo_url: str = Field(..., description="GitHub repository URL (public repos only)")


class EvaluationCreateResponse(BaseModel):
    """Response after creating an evaluation."""
    id: str
    status: EvaluationStatus
    message: str


class EvaluationListResponse(BaseModel):
    """Response for listing evaluations."""
    evaluations: List[RepoEvaluation]
    total: int