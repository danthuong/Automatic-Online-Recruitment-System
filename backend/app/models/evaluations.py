"""Models for repository evaluations and GitHub profiles"""

from typing import List, Optional, Dict
from enum import Enum
from pydantic import BaseModel


class EvaluationStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class EvaluationCreateRequest(BaseModel):
    repo_url: str
    candidate_id: str


class EvaluationCreateResponse(BaseModel):
    evaluation_id: str
    status: EvaluationStatus


class EvaluationListResponse(BaseModel):
    evaluations: List["RepoEvaluation"]


class RepoEvaluation(BaseModel):
    id: str
    username: str
    repo_url: str

    candidate_id: Optional[str] = "anonymous"
    status: EvaluationStatus = EvaluationStatus.PENDING
    score: Optional[float] = None
    overall_score: Optional[float] = None
    feedback: Optional[str] = None
    error_message: Optional[str] = None
    code_quality_score: Optional[float] = None
    documentation_score: Optional[float] = None
    best_practices_score: Optional[float] = None
    tech_stack_score: Optional[float] = None
    testing_score: Optional[float] = None
    security_score: Optional[float] = None
    architecture_score: Optional[float] = None
    strengths: List[str] = []
    weaknesses: List[str] = []
    recommendations: List[str] = []
    tech_stack_detected: List[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None
    evaluation_details: Optional[Dict] = None


# GitHub Profile Models
class GitHubRepo(BaseModel):
    name: str
    full_name: Optional[str] = None
    description: Optional[str] = None
    stars: int = 0
    forks: int = 0
    language: Optional[str] = None
    url: Optional[str] = None
    updated_at: Optional[str] = None
    topics: List[str] = []
    evaluation_id: Optional[str] = None
    evaluation_status: EvaluationStatus = EvaluationStatus.PENDING
    overall_score: Optional[float] = None
    code_quality_score: Optional[float] = None
    documentation_score: Optional[float] = None
    best_practices_score: Optional[float] = None
    tech_stack_score: Optional[float] = None
    testing_score: Optional[float] = None
    security_score: Optional[float] = None
    architecture_score: Optional[float] = None
    strengths: List[str] = []
    weaknesses: List[str] = []
    recommendations: List[str] = []
    tech_stack_detected: List[str] = []


class UserGitHubProfile(BaseModel):
    username: str
    name: Optional[str] = None
    bio: Optional[str] = None
    repositories: List[GitHubRepo] = []


class GitHubProfileFetchRequest(BaseModel):
    username: str
    max_repos: int = 10


class GitHubProfileFetchResponse(BaseModel):
    profile: UserGitHubProfile
    cached: bool = False


class GitHubProfileGetResponse(BaseModel):
    profile: UserGitHubProfile