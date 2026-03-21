"""
Tests for NodeAPIClient - verifies Python can fetch data from Node.js API.

Run with: pytest backend/tests/test_node_api_client.py -v
"""
import pytest
from unittest.mock import patch, Mock
import httpx

from app.services.node_api_client import NodeAPIClient


class TestNodeAPIClient:
    """Test suite for NodeAPIClient."""

    @pytest.fixture
    def client(self):
        """Create a test client pointing to localhost."""
        return NodeAPIClient(base_url="http://localhost:5000/api/v1")

    def test_client_initialization(self, client):
        """Test client initializes with correct base URL."""
        assert client.base_url == "http://localhost:5000/api/v1"

    def test_get_job_success(self, client):
        """Test fetching a job by ID."""
        mock_response = Mock()
        mock_response.json.return_value = {
            "_id": "507f1f77bcf86cd799439011",
            "title": "Senior Frontend Developer",
            "requiredSkills": ["React", "TypeScript", "JavaScript"],
            "preferredSkills": ["Next.js", "GraphQL"],
            "description": "We are looking for an experienced frontend developer..."
        }
        mock_response.raise_for_status = Mock()

        with patch.object(client, 'client') as mock_client:
            mock_client.get.return_value = mock_response

            result = client.get_job("507f1f77bcf86cd799439011")

            assert result["title"] == "Senior Frontend Developer"
            assert "React" in result["requiredSkills"]
            mock_client.get.assert_called_once_with("/jobs/507f1f77bcf86cd799439011")

    def test_get_job_not_found(self, client):
        """Test 404 response when job not found."""
        with patch.object(client, 'client') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 404
            mock_response.text = "Job not found"
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "404 Not Found",
                request=Mock(),
                response=mock_response
            )

            mock_client.get.return_value = mock_response

            with pytest.raises(httpx.HTTPStatusError):
                client.get_job("invalid-id")

    def test_get_candidate_profile_with_token(self, client):
        """Test fetching candidate profile with JWT token."""
        mock_response = Mock()
        mock_response.json.return_value = {
            "_id": "507f1f77bcf86cd799439012",
            "skills": ["JavaScript", "React", "Node.js"],
            "experience": 3,
            "parsedCvData": {
                "skills": ["JavaScript", "React", "Node.js"],
                "experience_years": 3,
                "education": "FPT University"
            }
        }
        mock_response.raise_for_status = Mock()

        with patch.object(client, 'client') as mock_client:
            mock_client.get.return_value = mock_response

            result = client.get_candidate_profile(
                "507f1f77bcf86cd799439012",
                token="test-jwt-token"
            )

            assert result["parsedCvData"]["skills"] == ["JavaScript", "React", "Node.js"]

    def test_save_questions_success(self, client):
        """Test saving questions to MongoDB."""
        mock_response = Mock()
        mock_response.json.return_value = [
            {"_id": "q1", "title": "Test Question 1"},
            {"_id": "q2", "title": "Test Question 2"}
        ]
        mock_response.raise_for_status = Mock()

        questions = [
            {"title": "Test Question 1", "type": "code"},
            {"title": "Test Question 2", "type": "essay"}
        ]

        with patch.object(client, 'client') as mock_client:
            mock_client.post.return_value = mock_response

            result = client.save_questions(questions, token="test-token")

            assert len(result) == 2
            mock_client.post.assert_called_once()
            call_args = mock_client.post.call_args
            assert call_args.kwargs["json"] == questions


class TestNodeAPIEndpointMapping:
    """Test that endpoints are correctly mapped."""

    def test_candidate_by_id_uses_users_endpoint(self):
        """Verify get_candidate_by_id uses /users/:id not /candidates/:id."""
        with patch('httpx.Client') as mock_client_class:
            mock_client = Mock()
            mock_client_class.return_value = mock_client

            mock_response = Mock()
            mock_response.json.return_value = {"_id": "test-id"}
            mock_response.raise_for_status = Mock()
            mock_client.get.return_value = mock_response

            client = NodeAPIClient()
            client.get_candidate_by_id("test-user-id")

            # Verify /users/:id is called, not /candidates/:id
            called_url = mock_client.get.call_args[0][0]
            assert "/users/" in called_url
            assert "/candidates/" not in called_url