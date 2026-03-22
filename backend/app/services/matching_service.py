"""
CV-JD Similarity Matching Service.

Compares candidate's parsed CV with job description to compute match scores.
"""
import json
import logging
from typing import Optional, Dict, Any, List

from .llm_service import get_llm_service
from .node_api_client import get_node_api_client
from .pdf_parser_service import get_pdf_parser_service

logger = logging.getLogger(__name__)


# LLM prompt for CV-JD matching
CV_JD_MATCHING_PROMPT = """You are an expert HR analyst. Compare this candidate's CV to the job description.

Candidate Skills: {skills}
Experience (years): {experience_years}
Education: {education}
Projects: {projects}

Job Title: {job_title}
Required Skills: {required_skills}
Preferred Skills: {preferred_skills}
Experience Level: {experience_level}
Job Description: {job_description}

Return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{{
  "skillMatchScore": 85,
  "experienceMatchScore": 70,
  "educationMatchScore": 80,
  "skillGaps": ["missing skill 1", "missing skill 2"],
  "strengths": ["matched skill 1", "matched skill 2"],
  "matchedPreferredSkills": ["preferred skill matched"],
  "llmFeedback": "2-3 sentence summary of the match"
}}

Provide scores from 0-100. skillGaps should list skills from required_skills that the candidate lacks.
strengths should list skills from required_skills that the candidate has.
matchedPreferredSkills should list skills from preferred_skills that the candidate has.
"""


class MatchingService:
    """Service for CV-JD similarity matching."""

    def __init__(self):
        self.llm = get_llm_service()
        self.node_client = get_node_api_client()

    def fetch_candidate_data(
        self,
        candidate_id: str,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch candidate data from Node.js API.

        Args:
            candidate_id: MongoDB ObjectId of candidate
            token: JWT token for authentication

        Returns:
            Candidate data including parsedCvData, skills, name

        Raises:
            ValueError: If candidate not found or CV not parsed
        """
        # Try the candidate-profile endpoint first
        try:
            candidate = self.node_client.get_candidate_profile(candidate_id, token)
        except Exception:
            # Fallback to direct candidate endpoint
            candidate = self.node_client.get_candidate_by_id(candidate_id, token)

        if not candidate:
            raise ValueError(f"Candidate not found: {candidate_id}")

        # Check if CV has been parsed
        parsed_cv = candidate.get("parsedCvData") or candidate.get("parsed_cv_data")
        if not parsed_cv:
            raise ValueError("CV not parsed. Please upload and parse CV first.")

        return candidate

    def fetch_job_data(self, job_id: str) -> Dict[str, Any]:
        """
        Fetch job data from Node.js API.

        Args:
            job_id: MongoDB ObjectId of job

        Returns:
            Job data including title, requiredSkills, description, etc.

        Raises:
            ValueError: If job not found
        """
        job = self.node_client.get_job(job_id)

        if not job:
            raise ValueError(f"Job not found: {job_id}")

        return job

    def calculate_skill_score(
        self,
        candidate_skills: List[str],
        job_skills: List[str]
    ) -> int:
        """
        Calculate skill match score based on token overlap.

        Args:
            candidate_skills: List of candidate's skills
            job_skills: List of job's required skills

        Returns:
            Score from 0-100
        """
        if not job_skills:
            return 100

        if not candidate_skills:
            return 0

        # Normalize skills to lowercase for comparison
        candidate_set = set(s.lower() for s in candidate_skills)
        job_set = set(s.lower() for s in job_skills)

        # Calculate overlap
        matched = candidate_set & job_set
        score = int((len(matched) / len(job_set)) * 100)

        return min(score, 100)

    def extract_candidate_info(self, candidate: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant information from candidate data.

        Args:
            candidate: Full candidate data from API

        Returns:
            Dictionary with extracted skills, experience, education, projects
        """
        parsed_cv = candidate.get("parsedCvData") or candidate.get("parsed_cv_data") or {}

        # Extract skills
        skills = parsed_cv.get("skills", [])
        if not skills:
            # Try to get from top-level
            skills = candidate.get("skills", [])

        # Extract experience years
        experience_years = parsed_cv.get("experience_years", 0)
        if not experience_years:
            experience_years = parsed_cv.get("experienceYears", 0)

        # Extract education
        education = parsed_cv.get("education", [])
        if not education:
            education = candidate.get("education", [])

        # Extract projects
        projects = parsed_cv.get("projects", [])
        if not projects:
            projects = candidate.get("projects", [])

        # Extract name
        name = candidate.get("name", "")
        if not name:
            name = f"{candidate.get('firstName', '')} {candidate.get('lastName', '')}".strip()

        return {
            "name": name,
            "skills": skills,
            "experience_years": experience_years,
            "education": education,
            "projects": projects
        }

    def extract_job_info(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant information from job data.

        Args:
            job: Full job data from API

        Returns:
            Dictionary with extracted title, skills, description
        """
        # Extract required skills
        required_skills = job.get("requiredSkills", [])
        if not required_skills:
            required_skills = job.get("required_skills", [])

        # Extract preferred skills
        preferred_skills = job.get("preferredSkills", [])
        if not preferred_skills:
            preferred_skills = job.get("preferred_skills", [])

        # Extract description
        description = job.get("description", "")

        # Extract experience level
        experience_level = job.get("experienceLevel", "mid-level")
        if not experience_level:
            experience_level = job.get("experience_level", "mid-level")

        return {
            "title": job.get("title", "Unknown Position"),
            "required_skills": required_skills,
            "preferred_skills": preferred_skills,
            "description": description,
            "experience_level": experience_level
        }

    def compute_cv_jd_similarity(
        self,
        candidate_id: str,
        job_id: str,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compute similarity between candidate CV and job description.

        This is the main method that:
        1. Fetches candidate data
        2. Fetches job data
        3. Uses LLM to analyze the match
        4. Returns comprehensive match results

        Args:
            candidate_id: MongoDB ObjectId of candidate
            job_id: MongoDB ObjectId of job
            token: JWT token for authentication

        Returns:
            Dictionary with overallScore, skillMatchScore, experienceMatchScore,
            educationMatchScore, skillGaps, strengths, matchedPreferredSkills, llmFeedback

        Raises:
            ValueError: If candidate has no parsed CV or job not found
            RuntimeError: If LLM fails to generate valid response
        """
        logger.info(f"Computing CV-JD similarity for candidate {candidate_id} and job {job_id}")

        # Fetch data
        candidate = self.fetch_candidate_data(candidate_id, token)
        job = self.fetch_job_data(job_id)

        # Extract relevant info
        candidate_info = self.extract_candidate_info(candidate)
        job_info = self.extract_job_info(job)

        # Build prompt
        prompt = CV_JD_MATCHING_PROMPT.format(
            skills=", ".join(candidate_info["skills"]) or "None listed",
            experience_years=candidate_info["experience_years"] or 0,
            education=", ".join(str(e) for e in candidate_info["education"]) or "None listed",
            projects=", ".join(str(p) for p in candidate_info["projects"]) or "None listed",
            job_title=job_info["title"],
            required_skills=", ".join(job_info["required_skills"]) or "None listed",
            preferred_skills=", ".join(job_info["preferred_skills"]) or "None listed",
            experience_level=job_info["experience_level"],
            job_description=job_info["description"][:1000] if job_info["description"] else "None"
        )

        # Call LLM
        llm_response = self.llm.generate(prompt)

        # Parse LLM response
        try:
            # Try to extract JSON from response
            response_text = llm_response.strip()

            # Handle potential markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            result = json.loads(response_text.strip())

            # Calculate overall score as weighted average
            skill_score = result.get("skillMatchScore", 0)
            exp_score = result.get("experienceMatchScore", 0)
            edu_score = result.get("educationMatchScore", 0)

            overall_score = int((skill_score * 0.5) + (exp_score * 0.3) + (edu_score * 0.2))

            return {
                "candidateId": candidate_id,
                "jobId": job_id,
                "candidateName": candidate_info["name"],
                "jobTitle": job_info["title"],
                "overallScore": overall_score,
                "skillMatchScore": skill_score,
                "experienceMatchScore": exp_score,
                "educationMatchScore": edu_score,
                "skillGaps": result.get("skillGaps", []),
                "strengths": result.get("strengths", []),
                "matchedPreferredSkills": result.get("matchedPreferredSkills", []),
                "llmFeedback": result.get("llmFeedback", "")
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.error(f"LLM response was: {llm_response[:500]}")

            # Fallback: use simple scoring without LLM analysis
            skill_score = self.calculate_skill_score(
                candidate_info["skills"],
                job_info["required_skills"]
            )

            return {
                "candidateId": candidate_id,
                "jobId": job_id,
                "candidateName": candidate_info["name"],
                "jobTitle": job_info["title"],
                "overallScore": skill_score,
                "skillMatchScore": skill_score,
                "experienceMatchScore": 50,
                "educationMatchScore": 50,
                "skillGaps": [],
                "strengths": [],
                "matchedPreferredSkills": [],
                "llmFeedback": "Automated scoring completed. LLM analysis unavailable."
            }

    def compute_cv_jd_from_pdfs(
        self,
        cv_file_content: bytes,
        job_file_content: bytes
    ) -> Dict[str, Any]:
        """
        Compute similarity between candidate CV and job description from PDF files.

        This method:
        1. Extracts text from CV PDF
        2. Extracts text from Job Description PDF
        3. Uses LLM to parse both documents
        4. Uses LLM to analyze the match
        5. Returns comprehensive match results

        Args:
            cv_file_content: PDF file bytes for candidate's CV
            job_file_content: PDF file bytes for job description

        Returns:
            Dictionary with overallScore, skillMatchScore, experienceMatchScore,
            educationMatchScore, skillGaps, strengths, matchedPreferredSkills, llmFeedback
        """
        logger.info("Computing CV-JD similarity from PDF files")

        # Parse PDFs
        pdf_parser = get_pdf_parser_service()
        cv_data = pdf_parser.parse_cv_from_file(cv_file_content)
        job_data = pdf_parser.parse_job_from_file(job_file_content)

        logger.info(f"Parsed CV: {cv_data.get('name', 'Unknown')}, skills: {len(cv_data.get('skills', []))}")
        logger.info(f"Parsed JD: {job_data.get('title', 'Unknown')}, required skills: {len(job_data.get('required_skills', []))}")

        # Build prompt for matching
        prompt = CV_JD_MATCHING_PROMPT.format(
            skills=", ".join(cv_data.get("skills", [])) or "None listed",
            experience_years=cv_data.get("experience_years", 0),
            education=", ".join(str(e.get("degree", "")) for e in cv_data.get("education", [])) or "None listed",
            projects=", ".join(str(p.get("name", "")) for p in cv_data.get("projects", [])) or "None listed",
            job_title=job_data.get("title", "Unknown Position"),
            required_skills=", ".join(job_data.get("required_skills", [])) or "None listed",
            preferred_skills=", ".join(job_data.get("preferred_skills", [])) or "None listed",
            experience_level=job_data.get("experience_level", "mid-level"),
            job_description=job_data.get("description", "")[:1000] if job_data.get("description") else "None"
        )

        # Call LLM
        llm_response = self.llm.generate(prompt)

        # Parse LLM response
        try:
            response_text = llm_response.strip()

            # Handle potential markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            result = json.loads(response_text.strip())

            # Calculate overall score as weighted average
            skill_score = result.get("skillMatchScore", 0)
            exp_score = result.get("experienceMatchScore", 0)
            edu_score = result.get("educationMatchScore", 0)

            overall_score = int((skill_score * 0.5) + (exp_score * 0.3) + (edu_score * 0.2))

            return {
                "candidateName": cv_data.get("name", "Unknown"),
                "jobTitle": job_data.get("title", "Unknown"),
                "overallScore": overall_score,
                "skillMatchScore": skill_score,
                "experienceMatchScore": exp_score,
                "educationMatchScore": edu_score,
                "skillGaps": result.get("skillGaps", []),
                "strengths": result.get("strengths", []),
                "matchedPreferredSkills": result.get("matchedPreferredSkills", []),
                "llmFeedback": result.get("llmFeedback", ""),
                "parsedCV": cv_data,
                "parsedJob": job_data
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")

            # Fallback: use simple scoring
            candidate_skills = cv_data.get("skills", [])
            job_skills = job_data.get("required_skills", [])
            skill_score = self.calculate_skill_score(candidate_skills, job_skills)

            return {
                "candidateName": cv_data.get("name", "Unknown"),
                "jobTitle": job_data.get("title", "Unknown"),
                "overallScore": skill_score,
                "skillMatchScore": skill_score,
                "experienceMatchScore": 50,
                "educationMatchScore": 50,
                "skillGaps": [],
                "strengths": [],
                "matchedPreferredSkills": [],
                "llmFeedback": "Automated scoring completed. LLM analysis unavailable.",
                "parsedCV": cv_data,
                "parsedJob": job_data
            }


# Singleton instance
_matching_service: Optional[MatchingService] = None


def get_matching_service() -> MatchingService:
    """Get or create the singleton matching service instance."""
    global _matching_service
    if _matching_service is None:
        _matching_service = MatchingService()
    return _matching_service