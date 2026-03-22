"""Models for repository evaluations and GitHub profiles"""

from typing import List, Optional
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
    repo_url: str
    candidate_id: str
    status: EvaluationStatus
    score: Optional[float] = None
    feedback: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# GitHub Profile Models
class GitHubRepo(BaseModel):
    name: str
    description: Optional[str] = None
    stars: int = 0
    language: Optional[str] = None
    url: Optional[str] = None


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