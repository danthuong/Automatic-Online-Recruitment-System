"""
GitHub Profile Scraper Service using TinyFish.

Scrapes GitHub user profiles and repository metadata using TinyFish's
browser automation capabilities via SSE streaming.
"""
import json
import logging
from typing import Dict, List, Optional

import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)

# TinyFish API endpoint
TINYFISH_BASE_URL = "https://agent.tinyfish.ai/v1/automation/run-sse"


class GitHubScraperService:
    """Service for scraping GitHub profiles using TinyFish."""

    def __init__(self):
        self.api_key = settings.tinyfish_api_key

    def _call_tinyfish(self, url: str, goal: str) -> Optional[Dict]:
        """
        Call TinyFish API to scrape a URL using SSE streaming.

        Uses synchronous httpx to avoid event loop issues in FastAPI.
        """
        if not self.api_key:
            logger.error("TinyFish API key not configured")
            return None

        try:
            logger.info(f"TinyFish: Starting request for {url}")

            # Use synchronous httpx client
            with httpx.Client(timeout=600.0) as client:
                # Use streaming to process SSE events
                with client.stream(
                    "POST",
                    TINYFISH_BASE_URL,
                    headers={
                        "X-API-Key": self.api_key,
                        "Content-Type": "application/json",
                    },
                    json={"url": url, "goal": goal},
                ) as response:
                    if response.status_code != 200:
                        logger.error(f"TinyFish API error: {response.status_code}")
                        for line in response.iter_lines():
                            logger.error(f"TinyFish response: {line}")
                        return None

                    # Collect all data to find the final result
                    result_data = None
                    all_data = []  # Debug: collect all events
                    event_count = 0
                    for line in response.iter_lines():
                        event_count += 1
                        if line.startswith("data: "):
                            data = line[6:]  # Remove "data: " prefix
                            all_data.append(data)  # Debug
                            try:
                                parsed = json.loads(data)
                                logger.info(f"TinyFish event #{event_count}: type={parsed.get('type')}, status={parsed.get('status')}, msg={parsed.get('message', '')[:100]}")
                                # Check for complete result - TinyFish returns COMPLETE type
                                if parsed.get("type") == "COMPLETE" and parsed.get("status") == "COMPLETED":
                                    result_data = parsed.get("result")
                                    logger.info(f"TinyFish result received: {type(result_data)}")
                                    break
                                elif parsed.get("type") == "COMPLETE" and parsed.get("status") == "ERROR":
                                    logger.error(f"TinyFish error: {parsed.get('message')}")
                                    return None
                            except json.JSONDecodeError as e:
                                logger.warning(f"JSON decode error: {e}, data: {data[:100]}")
                                continue

                    logger.info(f"TinyFish: Total events received: {event_count}")
                    # Debug: log all events if result is None
                    if result_data is None:
                        logger.warning(f"TinyFish: No COMPLETE result found. Events count: {event_count}, Events: {all_data}")

                    if result_data is None:
                        logger.error(f"TinyFish: Request returned None for {url}")
                    else:
                        logger.info(f"TinyFish: Request succeeded for {url}")
                    return result_data

        except httpx.TimeoutException:
            logger.error("TinyFish request timed out")
            return None
        except Exception as e:
            logger.error(f"TinyFish request error: {e}", exc_info=True)
            return None

    def fetch_user_profile(self, username: str) -> Optional[Dict]:
        """
        Fetch a GitHub user's profile information.

        Args:
            username: GitHub username (e.g., "caoTayTang")

        Returns:
            Dict with profile info: avatar_url, bio, location, public_repos, etc.
        """
        goal = f"""Extract the GitHub user profile information. Return as JSON with these exact fields:
- avatar_url: URL of the user's avatar image
- bio: The user's bio/description (or null if not provided)
- location: The user's location (or null if not provided)
- public_repos: Number of public repositories
- followers: Number of followers
- following: Number of users they're following
- name: The user's display name (or null if not provided)
- username: The exact GitHub username

Return ONLY valid JSON, no additional text."""

        return self._call_tinyfish(f"https://github.com/{username}", goal)

    def fetch_user_repositories(self, username: str) -> List[Dict]:
        """
        Fetch all public repositories for a GitHub user.

        Args:
            username: GitHub username

        Returns:
            List of repository dicts with: name, description, stars, forks, language, updated_at
        """
        goal = f"""Extract ALL public repositories for user {username}. For each repository, return:
- name: Repository name
- full_name: Full name (username/repo_name)
- description: Repository description (or null)
- url: GitHub URL to the repository
- stars: Number of stars
- forks: Number of forks
- language: Primary programming language (or null)
- updated_at: Last updated date in ISO format
- topics: List of repository topics/tags

Return as a JSON array of repository objects. Include ALL public repos, no limit."""

        result = self._call_tinyfish(f"https://github.com/{username}?tab=repositories", goal)

        if result:
            if isinstance(result, str):
                try:
                    result = json.loads(result)
                except json.JSONDecodeError:
                    logger.error("Failed to parse repositories JSON")
                    return []
            if isinstance(result, list):
                return result

        return []

    def _parse_stars(self, stars_value) -> int:
        """Parse stars value to integer, handling 'k', 'M' suffixes."""
        if stars_value is None:
            return 0
        if isinstance(stars_value, int):
            return stars_value
        if isinstance(stars_value, str):
            stars_value = stars_value.lower().strip()
            if 'k' in stars_value:
                try:
                    return int(float(stars_value.replace('k', '')) * 1000)
                except ValueError:
                    return 0
            if 'm' in stars_value:
                try:
                    return int(float(stars_value.replace('m', '')) * 1000000)
                except ValueError:
                    return 0
            try:
                return int(stars_value)
            except ValueError:
                return 0
        return 0

    def fetch_profile_and_repos(
        self,
        username: str,
        max_repos: Optional[int] = None
    ) -> Optional[Dict]:
        """
        Fetch both profile and repositories.

        Args:
            username: GitHub username
            max_repos: Maximum number of repos to return (sorted by stars)

        Returns:
            Dict with profile and repositories
        """
        if max_repos is None:
            max_repos = settings.default_max_repos

        goal = f"""Extract the complete GitHub profile for user {username}:

1. Profile section: avatar_url, bio, location, public_repos, followers, following, name, username

2. ALL public repositories: For each repo get name, full_name, url, description, stars, forks, language, updated_at, topics

Return as JSON with this exact structure:
{{
  "profile": {{profile_fields}},
  "repositories": [{{repo1}}, {{repo2}}, ...]
}}

Return ONLY valid JSON, no additional text."""

        result = self._call_tinyfish(f"https://github.com/{username}", goal)

        if result:
            data = result
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except json.JSONDecodeError:
                    logger.error("Failed to parse profile+repos JSON")
                    return None

            # Sort repositories by stars and limit
            if "repositories" in data and isinstance(data["repositories"], list):
                repos = data["repositories"]
                # Sort by stars (descending), handle None values and string formats like "1.2k"
                repos.sort(key=lambda r: self._parse_stars(r.get("stars")), reverse=True)
                logger.info(f"Found {len(repos)} repos, limiting to {max_repos}")
                # Limit to max_repos
                data["repositories"] = repos[:max_repos]

            return data

        return None


# Global service instance
_scraper_service: Optional[GitHubScraperService] = None


def get_github_scraper_service() -> GitHubScraperService:
    """Get or create the singleton scraper service."""
    global _scraper_service
    if _scraper_service is None:
        _scraper_service = GitHubScraperService()
    return _scraper_service