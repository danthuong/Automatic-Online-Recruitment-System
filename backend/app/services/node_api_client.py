"""
HTTP client for Node.js API (port 5000).

Provides methods to fetch candidate profiles, job data, and save questions to MongoDB.
"""
import os
import logging
from typing import Optional, Dict, Any, List

import httpx

logger = logging.getLogger(__name__)

# Mock data for testing without authentication
MOCK_CANDIDATES = {
    "test-candidate-1": {
        "_id": "test-candidate-1",
        "email": "candidate1@test.com",
        "firstName": "John",
        "lastName": "Doe",
        "skills": ["JavaScript", "React", "Node.js", "TypeScript"],
        "experience": 3,
        "education": "FPT University",
        "parsedCvData": {
            "skills": ["JavaScript", "React", "Node.js", "TypeScript"],
            "experience_years": 3,
            "education": "FPT University",
            "projects": [],
            "summary": "John Doe is a 3-year experienced developer with expertise in JavaScript, React, Node.js and more."
        }
    }
}

MOCK_JOBS = {
    "test-job-1": {
        "_id": "test-job-1",
        "title": "Senior Frontend Developer",
        "description": "We are looking for an experienced frontend developer to build modern web applications using React and TypeScript.",
        "requiredSkills": ["React", "TypeScript", "JavaScript", "CSS"],
        "preferredSkills": ["Next.js", "GraphQL", "Testing"],
        "experienceLevel": "senior"
    }
}


class NodeAPIClient:
    """HTTP client for Node.js REST API."""

    def __init__(self, base_url: str = "http://localhost:5001/api/v1", mock_mode: bool = False):
        self.base_url = base_url
        self.mock_mode = mock_mode or os.getenv("MOCK_API", "false").lower() == "true"
        self._client: Optional[httpx.Client] = None

    @property
    def client(self) -> httpx.Client:
        """Lazy initialization of HTTP client."""
        if self._client is None:
            self._client = httpx.Client(base_url=self.base_url, timeout=30.0)
        return self._client

    def get_candidate_profile(
        self,
        candidate_id: str,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch candidate profile data.

        GET /users/me/candidate-profile

        Args:
            candidate_id: The candidate's MongoDB ObjectId
            token: JWT authentication token (required for protected endpoints)

        Returns:
            Candidate profile data including parsedCvData, skills, etc.

        Raises:
            httpx.HTTPStatusError: On HTTP errors
        """
        # Return mock data in mock mode
        if self.mock_mode:
            return MOCK_CANDIDATES.get(candidate_id, MOCK_CANDIDATES["test-candidate-1"])

        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            response = self.client.get(
                f"/users/me/candidate-profile",
                headers=headers,
                params={"candidateId": candidate_id}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to fetch candidate profile: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error fetching candidate profile: {e}")
            raise

    def get_candidate_by_id(
        self,
        candidate_id: str,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch candidate by ID (alternative endpoint).

        GET /users/{id}

        Args:
            candidate_id: The candidate's MongoDB ObjectId
            token: JWT authentication token

        Returns:
            Candidate data including parsedCvData, skills, etc.

        Raises:
            httpx.HTTPStatusError: On HTTP errors
        """
        # Return mock data in mock mode
        if self.mock_mode:
            return MOCK_CANDIDATES.get(candidate_id, MOCK_CANDIDATES["test-candidate-1"])

        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            response = self.client.get(
                f"/users/{candidate_id}",
                headers=headers
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to fetch candidate: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error fetching candidate: {e}")
            raise

    def get_job(self, job_id: str) -> Dict[str, Any]:
        """
        Fetch job description and requirements.

        GET /jobs/{jobId}

        Args:
            job_id: The job's MongoDB ObjectId

        Returns:
            Job data including title, requiredSkills, preferredSkills, description, etc.

        Raises:
            httpx.HTTPStatusError: On HTTP errors
        """
        # Return mock data in mock mode
        if self.mock_mode:
            return MOCK_JOBS.get(job_id, MOCK_JOBS["test-job-1"])

        try:
            response = self.client.get(f"/jobs/{job_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to fetch job: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error fetching job: {e}")
            raise

    def save_questions(
        self,
        questions: List[Dict[str, Any]],
        token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Save generated questions to MongoDB.

        POST /questions/bulk

        Args:
            questions: List of question objects to save
            token: JWT authentication token

        Returns:
            List of saved questions with MongoDB _id assigned

        Raises:
            httpx.HTTPStatusError: On HTTP errors
        """
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            response = self.client.post(
                "/questions/bulk",
                headers=headers,
                json=questions
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to save questions: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error saving questions: {e}")
            raise


# Singleton instance
_node_api_client: Optional[NodeAPIClient] = None


def get_node_api_client() -> NodeAPIClient:
    """Get or create the singleton Node API client instance."""
    global _node_api_client
    if _node_api_client is None:
        _node_api_client = NodeAPIClient()
    return _node_api_client