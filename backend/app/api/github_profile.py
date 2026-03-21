"""
API endpoints for GitHub profile fetching and evaluation.

Provides endpoints to:
- Fetch GitHub user profile and repositories via TinyFish
- Trigger evaluations for top repositories
- Get profile with evaluation results
"""
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException

from ..models.evaluations import (
    EvaluationStatus,
    GitHubRepo,
    GitHubProfileFetchRequest,
    GitHubProfileFetchResponse,
    GitHubProfileGetResponse,
    RepoEvaluation,
    UserGitHubProfile,
)
from ..services.github_scraper_service import get_github_scraper_service
from ..services.repo_evaluation_service import get_evaluation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/github", tags=["github-profile"])

# In-memory storage for GitHub profiles
# Format: {username: UserGitHubProfile}
_profiles_store: Dict[str, UserGitHubProfile] = {}

# Track evaluation IDs by username
# Format: {username: {repo_full_name: evaluation_id}}
_username_evaluations: Dict[str, Dict[str, str]] = {}

# Thread pool for parallel repo evaluations
_executor = ThreadPoolExecutor(max_workers=5)


def run_evaluation_task(
    evaluation_id: str,
    username: str,
    repo_full_name: str,
    repo_url: str
):
    """Background task to run repository evaluation."""
    from ..api.repo_evaluation import _evaluations_store

    evaluation = _evaluations_store.get(evaluation_id)
    if not evaluation:
        logger.error(f"Evaluation not found: {evaluation_id}")
        return

    try:
        service = get_evaluation_service()
        service.evaluate_repository(repo_url, evaluation)
        logger.info(
            f"Evaluation completed: {evaluation_id}, "
            f"status: {evaluation.status}, score: {evaluation.overall_score}"
        )

        # Update the stored profile with evaluation results
        if username in _profiles_store:
            profile = _profiles_store[username]
            for repo in profile.repositories:
                if repo.full_name == repo_full_name:
                    repo.evaluation_status = evaluation.status
                    repo.overall_score = evaluation.overall_score
                    # Copy detailed rubric scores
                    repo.code_quality_score = evaluation.code_quality_score
                    repo.documentation_score = evaluation.documentation_score
                    repo.best_practices_score = evaluation.best_practices_score
                    repo.tech_stack_score = evaluation.tech_stack_score
                    repo.testing_score = evaluation.testing_score
                    repo.security_score = evaluation.security_score
                    repo.architecture_score = evaluation.architecture_score
                    repo.strengths = evaluation.strengths or []
                    repo.weaknesses = evaluation.weaknesses or []
                    repo.recommendations = evaluation.recommendations or []
                    repo.tech_stack_detected = evaluation.tech_stack_detected or []
                    break

    except Exception as e:
        logger.error(f"Evaluation task failed: {e}", exc_info=True)
        evaluation.status = EvaluationStatus.FAILED
        evaluation.error_message = str(e)


def _parse_datetime(date_str: Optional[str]) -> Optional[datetime]:
    """Parse datetime string from GitHub data."""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None


@router.post("/profile", response_model=GitHubProfileFetchResponse)
async def fetch_github_profile(
    request: GitHubProfileFetchRequest
):
    """
    Fetch a GitHub user profile and their top repositories.

    This endpoint:
    1. Uses TinyFish to scrape the GitHub profile
    2. Returns all repositories sorted by stars
    3. Triggers background evaluations for top N repositories
    4. Returns profile data with evaluation IDs
    """
    from ..api.repo_evaluation import _evaluations_store

    username = request.username.strip().lstrip('@')

    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    # Initialize scraper
    scraper = get_github_scraper_service()

    if not scraper.api_key:
        raise HTTPException(
            status_code=503,
            detail="TinyFish API key not configured"
        )

    # Fetch profile and repositories
    logger.info(f"Fetching GitHub profile for: {username}")
    try:
        data = scraper.fetch_profile_and_repos(username, request.max_repos)
    except Exception as e:
        logger.error(f"Scraper error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Scraper error: {str(e)}"
        )

    if not data:
        logger.error(f"Scraper returned None for {username}")
        raise HTTPException(
            status_code=500,
            detail=f"TinyFish API call failed. Check server logs. Username: {username}"
        )

    # Parse profile data
    profile_data = data.get("profile", {})
    repos_data = data.get("repositories", [])

    # Convert to GitHubRepo objects
    repositories = []
    for repo_data in repos_data:
        repo = GitHubRepo(
            name=repo_data.get("name", ""),
            full_name=repo_data.get("full_name", ""),
            url=repo_data.get("url", ""),
            description=repo_data.get("description"),
            stars=repo_data.get("stars", 0),
            forks=repo_data.get("forks", 0),
            language=repo_data.get("language"),
            updated_at=repo_data.get("updated_at"),  # Keep as string (e.g., "yesterday")
            topics=repo_data.get("topics", []),
        )
        repositories.append(repo)

    # Create UserGitHubProfile
    profile = UserGitHubProfile(
        username=username,
        avatar_url=profile_data.get("avatar_url"),
        bio=profile_data.get("bio"),
        location=profile_data.get("location"),
        name=profile_data.get("name"),
        public_repos=profile_data.get("public_repos", 0),
        followers=profile_data.get("followers", 0),
        following=profile_data.get("following", 0),
        repositories=repositories,
    )

    # Store profile
    _profiles_store[username] = profile
    _username_evaluations[username] = {}

    # Trigger evaluations for top repositories
    evaluation_ids = []
    for repo in repositories[:request.max_repos]:
        # Create evaluation record
        evaluation = RepoEvaluation(
            username=username,
            repo_url=repo.url
        )
        _evaluations_store[evaluation.id] = evaluation

        # Track evaluation ID for this repo
        _username_evaluations[username][repo.full_name] = evaluation.id

        # Update repo with evaluation ID
        repo.evaluation_id = evaluation.id
        repo.evaluation_status = EvaluationStatus.PENDING

        # Submit to thread pool for parallel execution
        _executor.submit(
            run_evaluation_task,
            evaluation.id,
            username,
            repo.full_name,
            repo.url
        )
        evaluation_ids.append(evaluation.id)

    logger.info(
        f"Profile fetched for {username}: {len(repositories)} repos, "
        f"{len(evaluation_ids)} evaluations started"
    )

    return GitHubProfileFetchResponse(
        profile=profile,
        evaluation_ids=evaluation_ids,
        message=f"Profile fetched. {len(evaluation_ids)} evaluations started in background."
    )


@router.get("/profile/{username}", response_model=GitHubProfileGetResponse)
async def get_github_profile(username: str):
    """
    Get a GitHub profile with evaluation results.

    Returns the profile and all repositories with their evaluation status
    and scores (if available).
    """
    username = username.strip().lstrip('@')

    if username not in _profiles_store:
        raise HTTPException(
            status_code=404,
            detail=f"Profile not found for user: {username}. "
                   "Use POST /api/github/profile to fetch first."
        )

    profile = _profiles_store[username]

    # Count evaluated repos
    evaluated_count = sum(
        1 for repo in profile.repositories
        if repo.evaluation_status == EvaluationStatus.COMPLETED
    )

    return GitHubProfileGetResponse(
        username=username,
        profile=profile,
        total_repos=len(profile.repositories),
        evaluated_repos=evaluated_count
    )


@router.post("/profile/{username}/evaluate")
async def trigger_evaluations(username: str, max_repos: int = 10):
    """
    Trigger evaluations for a user's top repositories.

    This is useful if previous evaluations failed or need to be re-run.
    """
    from ..api.repo_evaluation import _evaluations_store

    username = username.strip().lstrip('@')

    if username not in _profiles_store:
        raise HTTPException(
            status_code=404,
            detail=f"Profile not found for user: {username}"
        )

    profile = _profiles_store[username]
    evaluation_ids = []

    for repo in profile.repositories[:max_repos]:
        # Check if evaluation already exists and is not failed
        existing_eval_id = _username_evaluations.get(username, {}).get(repo.full_name)
        if existing_eval_id:
            existing_eval = _evaluations_store.get(existing_eval_id)
            if existing_eval and existing_eval.status != EvaluationStatus.FAILED:
                continue

        # Create new evaluation
        evaluation = RepoEvaluation(
            username=username,
            repo_url=repo.url
        )
        _evaluations_store[evaluation.id] = evaluation
        _username_evaluations[username][repo.full_name] = evaluation.id

        repo.evaluation_id = evaluation.id
        repo.evaluation_status = EvaluationStatus.PENDING
        evaluation_ids.append(evaluation.id)

    # Note: This would need to be called in a background task in production
    # For now, return the evaluation IDs

    return {
        "message": f"Created {len(evaluation_ids)} new evaluations",
        "evaluation_ids": evaluation_ids
    }


@router.get("/profile/{username}/evaluations")
async def get_profile_evaluations(username: str):
    """Get all evaluations for a user's repositories."""
    from ..api.repo_evaluation import _evaluations_store

    username = username.strip().lstrip('@')

    if username not in _profiles_store:
        raise HTTPException(
            status_code=404,
            detail=f"Profile not found for user: {username}"
        )

    profile = _profiles_store[username]
    evaluations = []

    for repo in profile.repositories:
        if repo.evaluation_id:
            eval_obj = _evaluations_store.get(repo.evaluation_id)
            if eval_obj:
                evaluations.append(eval_obj)

    return {
        "username": username,
        "evaluations": evaluations,
        "total": len(evaluations)
    }


@router.get("/evaluations/{evaluation_id}")
async def get_evaluation_by_id(evaluation_id: str):
    """Get a specific evaluation by ID."""
    from ..api.repo_evaluation import _evaluations_store

    evaluation = _evaluations_store.get(evaluation_id)
    if not evaluation:
        raise HTTPException(
            status_code=404,
            detail=f"Evaluation not found: {evaluation_id}"
        )

    return evaluation


@router.post("/evaluate-repo")
async def evaluate_single_repo(request: dict):
    """
    Evaluate a single repository by full name (owner/repo).

    Example: {"repo_full_name": "caoTayTang/some-repo", "repo_url": "https://github.com/caoTayTang/some-repo"}
    """
    from ..api.repo_evaluation import _evaluations_store

    repo_full_name = request.get("repo_full_name", "")
    repo_url = request.get("repo_url", "")

    if not repo_full_name or not repo_url:
        raise HTTPException(
            status_code=400,
            detail="repo_full_name and repo_url are required"
        )

    # Extract username from repo_full_name
    parts = repo_full_name.split("/")
    if len(parts) != 2:
        raise HTTPException(
            status_code=400,
            detail="Invalid repo_full_name format. Use: owner/repo"
        )

    username = parts[0]

    # Create evaluation
    evaluation = RepoEvaluation(
        username=username,
        repo_url=repo_url
    )
    _evaluations_store[evaluation.id] = evaluation

    # Submit to thread pool
    _executor.submit(
        run_evaluation_task,
        evaluation.id,
        username,
        repo_full_name,
        repo_url
    )

    return {
        "message": "Evaluation started",
        "evaluation_id": evaluation.id,
        "repo_full_name": repo_full_name
    }