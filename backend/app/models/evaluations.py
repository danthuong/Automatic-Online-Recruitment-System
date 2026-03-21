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


class GitHubRepo(BaseModel):
    """A GitHub repository with metadata."""
    name: str
    full_name: str
    url: str
    description: Optional[str] = None
    stars: int = 0
    forks: int = 0
    language: Optional[str] = None
    updated_at: Optional[str] = None  # TinyFish returns relative dates like "yesterday"
    topics: List[str] = Field(default_factory=list)

    # Evaluation result (if evaluated)
    evaluation_id: Optional[str] = None
    evaluation_status: Optional[EvaluationStatus] = None
    overall_score: Optional[float] = None
    # Detailed rubric scores
    code_quality_score: Optional[float] = None
    documentation_score: Optional[float] = None
    best_practices_score: Optional[float] = None
    tech_stack_score: Optional[float] = None
    testing_score: Optional[float] = None
    security_score: Optional[float] = None
    architecture_score: Optional[float] = None
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    tech_stack_detected: List[str] = Field(default_factory=list)


class UserGitHubProfile(BaseModel):
    """User's GitHub profile data fetched via TinyFish."""
    username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    name: Optional[str] = None
    public_repos: int = 0
    followers: int = 0
    following: int = 0
    repositories: List[GitHubRepo] = Field(default_factory=list)


class RepoEvaluation(BaseModel):
    """Model for GitHub repository evaluation results."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    # GitHub info
    username: Optional[str] = None  # GitHub username (for profile-linked evaluations)
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


# GitHub Profile API Request/Response Models

class GitHubProfileFetchRequest(BaseModel):
    """Request to fetch a GitHub user profile."""
    username: str = Field(..., description="GitHub username (without @)")
    max_repos: Optional[int] = Field(
        default=10,
        description="Maximum number of repositories to fetch (sorted by stars)"
    )


class GitHubProfileFetchResponse(BaseModel):
    """Response after fetching GitHub profile."""
    profile: UserGitHubProfile
    evaluation_ids: List[str] = Field(default_factory=list)
    message: str


class GitHubProfileGetResponse(BaseModel):
    """Response for getting GitHub profile with evaluation results."""
    username: str
    profile: UserGitHubProfile
    total_repos: int
    evaluated_repos: int