"""
Dynamic Interview Question Generation Service.

Generates 5 interview questions (3 coding + 2 essay) based on candidate's CV.
Supports both MongoDB data and direct PDF file upload.
"""
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from .llm_service import get_llm_service
from .matching_service import get_matching_service
from .node_api_client import get_node_api_client
from .pdf_parser_service import get_pdf_parser_service

logger = logging.getLogger(__name__)


# LLM prompts for question generation
CODING_QUESTION_PROMPT = """Generate {count} coding questions for a candidate with these skills: {skills}

Requirements:
- {difficulty_distribution}
- Questions should be based on candidate's known programming languages and frameworks
- Include: title, content, constraints, examples, testCases, starterCode (in Python and JavaScript)

Return ONLY a valid JSON array (no markdown, no explanation) with {count} objects.
Each object should have exactly these fields:
{{
  "type": "code",
  "difficulty": "easy|medium|hard",
  "title": "Problem title",
  "content": "Full problem description with context",
  "constraints": ["constraint1", "constraint2"],
  "examples": [{{"input": "input example", "output": "output example"}}],
  "testCases": [{{"input": "test input", "expected": "expected output"}}],
  "starterCode": {{"python": "def solution():", "javascript": "function solution() {{}}"}},
  "tags": ["tag1", "tag2"]
}}

Use realistic coding problems appropriate for the candidate's skill level.
"""

ESSAY_QUESTION_PROMPT = """Generate {count} essay questions based on candidate's projects AND work experience:

Projects:
{projects}

Work Experience:
{experience_entries}

Requirements:
- Probe technical depth, challenges faced, solutions implemented
- Verify authenticity of experience through specific technical questions
- Ask about decision-making and trade-offs

Return ONLY a valid JSON array (no markdown, no explanation) with {count} objects.
Each object should have exactly these fields:
{{
  "type": "essay",
  "difficulty": "easy|medium|hard",
  "title": "Question title",
  "content": "Detailed question that probes depth",
  "expectedAnswer": "What kind of answer would demonstrate competence",
  "tags": ["tag1", "tag2"]
}}

Make questions specific to the candidate's actual projects and experience.
If there's no specific project/experience data, generate general technical depth questions.
"""


class QuestionGenerationService:
    """Service for generating interview questions based on candidate CV."""

    def __init__(self):
        self.llm = get_llm_service()
        self.matching_service = get_matching_service()
        self.node_client = get_node_api_client()

    def fetch_candidate_data(
        self,
        candidate_id: str,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch candidate data for question generation.

        Args:
            candidate_id: MongoDB ObjectId of candidate
            token: JWT token for authentication

        Returns:
            Candidate data including parsed CV, skills, projects, experience

        Raises:
            ValueError: If candidate not found
        """
        # Reuse matching service's fetch method
        return self.matching_service.fetch_candidate_data(candidate_id, token)

    def fetch_job_data(self, job_id: str) -> Dict[str, Any]:
        """
        Fetch job data for context.

        Args:
            job_id: MongoDB ObjectId of job

        Returns:
            Job data
        """
        return self.matching_service.fetch_job_data(job_id)

    def extract_coding_skills(self, candidate_data: Dict[str, Any]) -> List[str]:
        """
        Extract programming languages and frameworks from candidate data.

        Args:
            candidate_data: Full candidate data

        Returns:
            List of coding-related skills
        """
        parsed_cv = candidate_data.get("parsedCvData") or candidate_data.get("parsed_cv_data") or {}

        # Try to get skills from various sources
        skills = candidate_data.get("skills", [])
        if not skills:
            skills = parsed_cv.get("skills", [])

        # Filter for coding-related skills (programming languages and frameworks)
        coding_keywords = [
            "python", "javascript", "java", "typescript", "go", "rust", "c++", "c#",
            "ruby", "php", "swift", "kotlin", "scala", "sql", "html", "css",
            "react", "angular", "vue", "node", "django", "flask", "spring",
            "express", "nextjs", "next.js", "graphql", "rest", "api",
            "docker", "kubernetes", "aws", "gcp", "azure", "linux",
            "git", "github", "CI/CD", "jenkins", "mongodb", "postgresql", "redis"
        ]

        coding_skills = []
        for skill in skills:
            skill_lower = skill.lower()
            if any(keyword in skill_lower for keyword in coding_keywords):
                coding_skills.append(skill)

        # Default skills if none found
        if not coding_skills:
            coding_skills = ["Python", "JavaScript", "SQL"]

        return coding_skills

    def extract_experience_entries(self, candidate_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract projects and work experience from candidate data.

        Args:
            candidate_data: Full candidate data

        Returns:
            Dictionary with projects and work_experience
        """
        parsed_cv = candidate_data.get("parsedCvData") or candidate_data.get("parsed_cv_data") or {}

        projects = candidate_data.get("projects", [])
        if not projects:
            projects = parsed_cv.get("projects", [])

        work_experience = candidate_data.get("workExperience", [])
        if not work_experience:
            work_experience = parsed_cv.get("work_experience", [])
        if not work_experience:
            work_experience = parsed_cv.get("experience", [])

        return {
            "projects": projects,
            "work_experience": work_experience
        }

    def generate_coding_questions(
        self,
        skills: List[str],
        count: int = 3,
        difficulty_distribution: str = "2 Easy, 1 Medium"
    ) -> List[Dict[str, Any]]:
        """
        Generate coding questions based on candidate's skills.

        Args:
            skills: List of candidate's coding skills
            count: Number of questions to generate
            difficulty_distribution: Description of difficulty distribution

        Returns:
            List of coding question objects
        """
        skills_str = ", ".join(skills)

        prompt = CODING_QUESTION_PROMPT.format(
            count=count,
            skills=skills_str,
            difficulty_distribution=difficulty_distribution
        )

        logger.info(f"Generating {count} coding questions for skills: {skills_str}")

        try:
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

            questions = json.loads(response_text.strip())

            # Ensure we have the right number of questions
            if len(questions) > count:
                questions = questions[:count]

            return questions

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse coding questions as JSON: {e}")
            logger.error(f"LLM response was: {llm_response[:500]}")

            # Return fallback questions
            return self._get_fallback_coding_questions(skills)

    def generate_essay_questions(
        self,
        experience: Dict[str, Any],
        count: int = 2
    ) -> List[Dict[str, Any]]:
        """
        Generate essay questions based on candidate's experience.

        Args:
            experience: Dictionary with projects and work_experience
            count: Number of questions to generate

        Returns:
            List of essay question objects
        """
        projects_str = json.dumps(experience.get("projects", []), indent=2)
        if not projects_str or projects_str == "[]":
            projects_str = "No specific projects listed"

        experience_str = json.dumps(experience.get("work_experience", []), indent=2)
        if not experience_str or experience_str == "[]":
            experience_str = "No specific work experience listed"

        prompt = ESSAY_QUESTION_PROMPT.format(
            count=count,
            projects=projects_str,
            experience_entries=experience_str
        )

        logger.info(f"Generating {count} essay questions")

        try:
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

            questions = json.loads(response_text.strip())

            # Ensure we have the right number of questions
            if len(questions) > count:
                questions = questions[:count]

            return questions

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse essay questions as JSON: {e}")
            logger.error(f"LLM response was: {llm_response[:500]}")

            # Return fallback questions
            return self._get_fallback_essay_questions()

    def _get_fallback_coding_questions(self, skills: List[str]) -> List[Dict[str, Any]]:
        """Generate fallback coding questions if LLM fails."""
        return [
            {
                "type": "code",
                "difficulty": "easy",
                "title": "Two Sum",
                "content": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
                "examples": [
                    {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]"},
                    {"input": "nums = [3,2,4], target = 6", "output": "[1,2]"}
                ],
                "testCases": [
                    {"input": "[3,3], 6", "expected": "[0,1]"},
                    {"input": "[2,7,11,15], 9", "expected": "[0,1]"}
                ],
                "starterCode": {
                    "python": "def two_sum(nums, target):",
                    "javascript": "function twoSum(nums, target) {}"
                },
                "tags": ["arrays", "hash-table"]
            },
            {
                "type": "code",
                "difficulty": "easy",
                "title": "Reverse String",
                "content": "Write a function that reverses a string. The input string is given as an array of characters.",
                "constraints": ["1 <= s.length <= 10^5", "s[i] is a printable ascii character"],
                "examples": [
                    {"input": "s = ['h','e','l','l','o']", "output": "['o','l','l','e','h']"},
                    {"input": "s = ['H','a','n','n','a','h']", "output": "['h','a','n','n','a','H']"}
                ],
                "testCases": [
                    {"input": "['h','e','l','l','o']", "expected": "['o','l','l','e','h']"}
                ],
                "starterCode": {
                    "python": "def reverse_string(s):",
                    "javascript": "function reverseString(s) {}"
                },
                "tags": ["strings", "two-pointers"]
            },
            {
                "type": "code",
                "difficulty": "medium",
                "title": "Longest Substring Without Repeating Characters",
                "content": "Given a string s, find the length of the longest substring without repeating characters.",
                "constraints": ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"],
                "examples": [
                    {"input": "s = 'abcabcbb'", "output": "3"},
                    {"input": "s = 'bbbbb'", "output": "1"}
                ],
                "testCases": [
                    {"input": "'abcabcbb'", "expected": "3"},
                    {"input": "'pwwkew'", "expected": "3"}
                ],
                "starterCode": {
                    "python": "def length_of_longest_substring(s):",
                    "javascript": "function lengthOfLongestSubstring(s) {}"
                },
                "tags": ["sliding-window", "hash-table", "strings"]
            }
        ]

    def _get_fallback_essay_questions(self) -> List[Dict[str, Any]]:
        """Generate fallback essay questions if LLM fails."""
        return [
            {
                "type": "essay",
                "difficulty": "medium",
                "title": "Technical Challenge Problem-Solving",
                "content": "Describe a technical challenge you faced in a project. What was the problem, how did you approach solving it, and what was the outcome?",
                "expectedAnswer": "Should demonstrate problem-solving process, technical depth, and learning from the experience",
                "tags": ["problem-solving", "technical-depth"]
            },
            {
                "type": "essay",
                "difficulty": "medium",
                "title": "System Design Decision",
                "content": "Walk me through a technical decision you made in a project. What were the trade-offs you considered, and why did you choose that approach?",
                "expectedAnswer": "Should demonstrate understanding of trade-offs, system design knowledge, and reasoning skills",
                "tags": ["system-design", "decision-making"]
            }
        ]

    def save_questions_to_mongodb(
        self,
        questions: List[Dict[str, Any]],
        token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Save generated questions to MongoDB via Node.js API.

        Args:
            questions: List of question objects
            token: JWT token for authentication

        Returns:
            List of saved questions with MongoDB _id

        Raises:
            RuntimeError: If save fails
        """
        try:
            saved_questions = self.node_client.save_questions(questions, token)
            logger.info(f"Saved {len(saved_questions)} questions to MongoDB")
            return saved_questions
        except Exception as e:
            logger.error(f"Failed to save questions to MongoDB: {e}")
            # Return questions without MongoDB IDs if save fails
            return questions

    def generate_interview_questions(
        self,
        candidate_id: str,
        job_id: Optional[str] = None,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate 5 interview questions (3 coding + 2 essay) based on candidate's CV.

        This is the main method that:
        1. Fetches candidate data
        2. Extracts coding skills and experience
        3. Generates 3 coding questions (2 easy + 1 medium)
        4. Generates 2 essay questions (based on experience)
        5. Saves questions to MongoDB

        Args:
            candidate_id: MongoDB ObjectId of candidate
            job_id: Optional job ID for additional context
            token: JWT token for authentication

        Returns:
            Dictionary with questions array and generatedAt timestamp

        Raises:
            ValueError: If candidate has no parsed CV
        """
        logger.info(f"Generating interview questions for candidate {candidate_id}")

        # Fetch candidate data
        candidate_data = self.fetch_candidate_data(candidate_id, token)

        # Extract coding skills
        coding_skills = self.extract_coding_skills(candidate_data)
        logger.info(f"Extracted coding skills: {coding_skills}")

        # Extract experience
        experience = self.extract_experience_entries(candidate_data)
        logger.info(f"Extracted experience: {len(experience.get('projects', []))} projects, {len(experience.get('work_experience', []))} work entries")

        # Generate coding questions (2 easy + 1 medium)
        coding_questions = self.generate_coding_questions(
            skills=coding_skills,
            count=3,
            difficulty_distribution="2 Easy, 1 Medium"
        )

        # Generate essay questions (2 based on experience)
        essay_questions = self.generate_essay_questions(
            experience=experience,
            count=2
        )

        # Combine all questions
        all_questions = coding_questions + essay_questions

        # Save to MongoDB (optional - will use original if fails)
        try:
            saved_questions = self.save_questions_to_mongodb(all_questions, token)
            questions_to_return = saved_questions
        except Exception as e:
            logger.warning(f"Could not save to MongoDB, using unsaved questions: {e}")
            questions_to_return = all_questions

        return {
            "questions": questions_to_return,
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        }

    def extract_coding_skills_from_parsed_cv(self, parsed_cv: Dict[str, Any]) -> List[str]:
        """
        Extract programming languages and frameworks from parsed CV data.

        Args:
            parsed_cv: Parsed CV data from PDF parser

        Returns:
            List of coding-related skills
        """
        skills = parsed_cv.get("skills", [])

        # Filter for coding-related skills
        coding_keywords = [
            "python", "javascript", "java", "typescript", "go", "rust", "c++", "c#",
            "ruby", "php", "swift", "kotlin", "scala", "sql", "html", "css",
            "react", "angular", "vue", "node", "django", "flask", "spring",
            "express", "nextjs", "next.js", "graphql", "rest", "api",
            "docker", "kubernetes", "aws", "gcp", "azure", "linux",
            "git", "github", "CI/CD", "jenkins", "mongodb", "postgresql", "redis"
        ]

        coding_skills = []
        for skill in skills:
            skill_lower = skill.lower()
            if any(keyword in skill_lower for keyword in coding_keywords):
                coding_skills.append(skill)

        # Default skills if none found
        if not coding_skills:
            coding_skills = ["Python", "JavaScript", "SQL"]

        return coding_skills

    def generate_interview_questions_from_pdf(
        self,
        cv_file_content: bytes
    ) -> Dict[str, Any]:
        """
        Generate 5 interview questions (3 coding + 2 essay) from CV PDF.

        This method:
        1. Extracts text from CV PDF
        2. Uses LLM to parse structured CV data
        3. Generates 3 coding questions based on skills
        4. Generates 2 essay questions based on experience/projects
        5. Returns generated questions

        Args:
            cv_file_content: PDF file bytes for candidate's CV

        Returns:
            Dictionary with questions array and generatedAt timestamp
        """
        logger.info("Generating interview questions from CV PDF")

        # Parse PDF
        pdf_parser = get_pdf_parser_service()
        parsed_cv = pdf_parser.parse_cv_from_file(cv_file_content)

        logger.info(f"Parsed CV PDF: {parsed_cv.get('name', 'Unknown')}, skills: {len(parsed_cv.get('skills', []))}")

        # Extract coding skills
        coding_skills = self.extract_coding_skills_from_parsed_cv(parsed_cv)
        logger.info(f"Extracted coding skills: {coding_skills}")

        # Extract experience (projects and work experience)
        experience = {
            "projects": parsed_cv.get("projects", []),
            "work_experience": parsed_cv.get("work_experience", [])
        }
        logger.info(f"Extracted experience: {len(experience.get('projects', []))} projects, {len(experience.get('work_experience', []))} work entries")

        # Generate coding questions (2 easy + 1 medium)
        coding_questions = self.generate_coding_questions(
            skills=coding_skills,
            count=3,
            difficulty_distribution="2 Easy, 1 Medium"
        )

        # Generate essay questions (2 based on experience)
        essay_questions = self.generate_essay_questions(
            experience=experience,
            count=2
        )

        # Combine all questions
        all_questions = coding_questions + essay_questions

        return {
            "questions": all_questions,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "parsedCV": parsed_cv
        }


# Singleton instance
_question_generation_service: Optional[QuestionGenerationService] = None


def get_question_generation_service() -> QuestionGenerationService:
    """Get or create the singleton question generation service instance."""
    global _question_generation_service
    if _question_generation_service is None:
        _question_generation_service = QuestionGenerationService()
    return _question_generation_service