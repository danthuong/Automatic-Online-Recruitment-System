"""
PDF Parsing Service for CV and Job Description extraction.

Extracts text from PDF files and uses LLM to parse structured data.
"""
import json
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

from .llm_service import get_llm_service
from pypdf import PdfReader

logger = logging.getLogger(__name__)


@dataclass
class ParsedCV:
    """Structured CV data extracted from PDF."""
    name: str
    skills: List[str]
    experience_years: int
    education: List[Dict[str, str]]
    projects: List[Dict[str, str]]
    work_experience: List[Dict[str, str]]
    summary: str


@dataclass
class ParsedJob:
    """Structured Job Description data extracted from PDF."""
    title: str
    required_skills: List[str]
    preferred_skills: List[str]
    responsibilities: List[str]
    experience_level: str
    education_requirements: str
    description: str


# LLM prompts for CV parsing
CV_PARSING_PROMPT = """Extract structured information from this CV/resume PDF.

Return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{{
  "name": "Full name of the candidate",
  "skills": ["skill1", "skill2", "skill3"],
  "experience_years": number,
  "education": [{{"degree": "degree name", "institution": "school name", "year": "graduation year"}}],
  "projects": [{{"name": "project name", "description": "what it does", "technologies": ["tech1", "tech2"]}}],
  "work_experience": [{{"title": "job title", "company": "company name", "duration": "duration", "description": "what you did"}}],
  "summary": "brief professional summary"
}}

If a field is not found, use an empty array or empty string.
Only include actual skills found in the CV - don't guess.
"""

# LLM prompts for Job Description parsing
JD_PARSING_PROMPT = """Extract structured information from this Job Description PDF.

Return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{{
  "title": "Job title",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["nice to have skill1"],
  "responsibilities": ["responsibility1", "responsibility2"],
  "experience_level": "entry/mid/senior/lead",
  "education_requirements": "education requirement",
  "description": "full job description text"
}}

If a field is not found, use an empty array or empty string.
Only include actual skills found in the JD - don't guess.
"""


class PDFParserService:
    """Service for parsing PDF files (CV and Job Description)."""

    def __init__(self):
        self.llm = get_llm_service()

    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """
        Extract text content from PDF file bytes.

        Args:
            file_content: PDF file as bytes

        Returns:
            Extracted text from all pages
        """
        try:
            from io import BytesIO
            reader = PdfReader(BytesIO(file_content))

            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"

            logger.info(f"Extracted {len(text)} characters from {len(reader.pages)} pages")
            return text

        except Exception as e:
            logger.error(f"PDF text extraction error: {e}")
            raise ValueError(f"Failed to extract text from PDF: {e}")

    def parse_cv_with_llm(self, raw_text: str) -> ParsedCV:
        """
        Use LLM to extract structured CV data from raw text.

        Args:
            raw_text: Extracted text from CV PDF

        Returns:
            ParsedCV object with structured data
        """
        logger.info(f"Parsing CV text ({len(raw_text)} characters)")

        try:
            # Truncate if too long (LLM context limits)
            max_chars = 8000
            truncated_text = raw_text[:max_chars] + "..." if len(raw_text) > max_chars else raw_text

            prompt = f"{CV_PARSING_PROMPT}\n\nCV Content:\n{truncated_text}"
            llm_response = self.llm.generate(prompt)

            # Parse JSON response
            response_text = llm_response.strip()

            # Handle potential markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            data = json.loads(response_text.strip())

            return ParsedCV(
                name=data.get("name", ""),
                skills=data.get("skills", []),
                experience_years=data.get("experience_years", 0),
                education=data.get("education", []),
                projects=data.get("projects", []),
                work_experience=data.get("work_experience", []),
                summary=data.get("summary", "")
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse CV JSON: {e}")
            logger.error(f"LLM response was: {llm_response[:500] if 'llm_response' in locals() else 'N/A'}")

            # Return minimal parsed CV on failure
            return ParsedCV(
                name="",
                skills=[],
                experience_years=0,
                education=[],
                projects=[],
                work_experience=[],
                summary=""
            )

    def parse_job_description_with_llm(self, raw_text: str) -> ParsedJob:
        """
        Use LLM to extract structured Job Description data from raw text.

        Args:
            raw_text: Extracted text from Job Description PDF

        Returns:
            ParsedJob object with structured data
        """
        logger.info(f"Parsing JD text ({len(raw_text)} characters)")

        try:
            # Truncate if too long
            max_chars = 8000
            truncated_text = raw_text[:max_chars] + "..." if len(raw_text) > max_chars else raw_text

            prompt = f"{JD_PARSING_PROMPT}\n\nJob Description Content:\n{truncated_text}"
            llm_response = self.llm.generate(prompt)

            # Parse JSON response
            response_text = llm_response.strip()

            # Handle potential markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            data = json.loads(response_text.strip())

            return ParsedJob(
                title=data.get("title", ""),
                required_skills=data.get("required_skills", []),
                preferred_skills=data.get("preferred_skills", []),
                responsibilities=data.get("responsibilities", []),
                experience_level=data.get("experience_level", "mid-level"),
                education_requirements=data.get("education_requirements", ""),
                description=data.get("description", "")
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JD JSON: {e}")
            logger.error(f"LLM response was: {llm_response[:500] if 'llm_response' in locals() else 'N/A'}")

            # Return minimal parsed job on failure
            return ParsedJob(
                title="",
                required_skills=[],
                preferred_skills=[],
                responsibilities=[],
                experience_level="mid-level",
                education_requirements="",
                description=""
            )

    def parse_cv_from_file(self, file_content: bytes) -> Dict[str, Any]:
        """
        Full pipeline: extract and parse CV from PDF file.

        Args:
            file_content: PDF file as bytes

        Returns:
            Dictionary with parsed CV data
        """
        raw_text = self.extract_text_from_pdf(file_content)
        parsed = self.parse_cv_with_llm(raw_text)

        return {
            "name": parsed.name,
            "skills": parsed.skills,
            "experience_years": parsed.experience_years,
            "education": parsed.education,
            "projects": parsed.projects,
            "work_experience": parsed.work_experience,
            "summary": parsed.summary,
            "raw_text_preview": raw_text[:500]  # First 500 chars for verification
        }

    def parse_job_from_file(self, file_content: bytes) -> Dict[str, Any]:
        """
        Full pipeline: extract and parse Job Description from PDF file.

        Args:
            file_content: PDF file as bytes

        Returns:
            Dictionary with parsed Job data
        """
        raw_text = self.extract_text_from_pdf(file_content)
        parsed = self.parse_job_description_with_llm(raw_text)

        return {
            "title": parsed.title,
            "required_skills": parsed.required_skills,
            "preferred_skills": parsed.preferred_skills,
            "responsibilities": parsed.responsibilities,
            "experience_level": parsed.experience_level,
            "education_requirements": parsed.education_requirements,
            "description": parsed.description,
            "raw_text_preview": raw_text[:500]
        }


# Singleton instance
_pdf_parser_service: Optional[PDFParserService] = None


def get_pdf_parser_service() -> PDFParserService:
    """Get or create the singleton PDF parser service instance."""
    global _pdf_parser_service
    if _pdf_parser_service is None:
        _pdf_parser_service = PDFParserService()
    return _pdf_parser_service