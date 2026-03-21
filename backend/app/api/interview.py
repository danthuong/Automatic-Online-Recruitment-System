"""
API endpoints for 5-question coding interview.

Provides endpoints to:
- Generate interview questions (Q1-Q3 from problems.json, Q4 from GitHub, Q5 from JD)
- Execute code against test cases (via Piston API)
- Evaluate written answers (via OpenAI)
"""
import json
import logging
import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview", tags=["interview"])

# Load problems from JSON
PROBLEMS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "problems.json")
_Problems: List[Dict] = []


def load_problems() -> List[Dict]:
    """Load problems from JSON file."""
    global _Problems
    if not _Problems:
        if os.path.exists(PROBLEMS_PATH):
            with open(PROBLEMS_PATH, "r", encoding="utf-8") as f:
                _Problems = json.load(f)
            logger.info(f"Loaded {len(_Problems)} problems from {PROBLEMS_PATH}")
        else:
            logger.warning(f"Problems file not found: {PROBLEMS_PATH}")
    return _Problems


# ====================
# Request/Response Models
# ====================


class GitHubProfileData(BaseModel):
    """Pre-fetched GitHub profile data (passed from registration)."""
    username: str
    repositories: List[Dict] = Field(default_factory=list)
    bio: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    public_repos: int = 0
    followers: int = 0
    following: int = 0


class InterviewGenerateRequest(BaseModel):
    """Request to generate interview questions."""
    candidate_name: str
    github_profile_data: Optional[GitHubProfileData] = None
    job_description: Optional[str] = None


class CodeQuestion(BaseModel):
    """A coding question (Q1-Q3)."""
    id: int
    type: str = "code"
    difficulty: str
    title: str
    description: str
    test_cases: List[Dict]


class GitHubQuestion(BaseModel):
    """A GitHub-based question (Q4)."""
    id: int
    type: str = "github"
    title: str
    description: str
    repo_data: Dict


class JDQuestion(BaseModel):
    """A job-description-based question (Q5)."""
    id: int
    type: str = "jd"
    title: str
    description: str


class InterviewGenerateResponse(BaseModel):
    """Response with generated interview questions."""
    candidate_name: str
    questions: List[Dict]  # Can be CodeQuestion, GitHubQuestion, or JDQuestion


class ExecuteCodeRequest(BaseModel):
    """Request to execute code against test cases."""
    user_code: str
    problem_id: int


class TestResult(BaseModel):
    """Result of a single test case."""
    test_case: int
    passed: bool
    input: str
    expected: str
    actual: str
    error: Optional[str] = None


class ExecuteCodeResponse(BaseModel):
    """Response with code execution results."""
    problem_id: int
    pass_percentage: float
    complexity: Optional[int] = None
    test_results: List[TestResult]


class EvaluateWritingRequest(BaseModel):
    """Request to evaluate a written answer."""
    question_text: str
    user_answer: str


class EvaluateWritingResponse(BaseModel):
    """Response with evaluation score and feedback."""
    score: int  # 1-10
    feedback: str  # 2-sentence feedback


# ====================
# Helper Functions
# ====================


def get_llm_service():
    """Get the LLM service instance."""
    from ..services.llm_service import get_llm_service as _get_llm
    return _get_llm()


async def generate_q4_from_github(github_data: GitHubProfileData) -> Dict:
    """Generate Q4 question from GitHub profile data using LLM."""
    llm = get_llm_service()

    # Prepare context from GitHub data
    repo_summary = []
    for repo in github_data.repositories[:5]:  # Top 5 repos
        repo_summary.append(f"- {repo.get('name', 'N/A')}: {repo.get('description', 'No description')} (stars: {repo.get('stars', 0)})")

    repo_text = "\n".join(repo_summary) if repo_summary else "No repositories found"

    prompt = f"""Based on the candidate's GitHub profile, generate a technical question about their work.

GitHub Username: {github_data.username}
Bio: {github_data.bio or 'Not provided'}
Name: {github_data.name or 'Not provided'}

Top Repositories:
{repo_text}

Generate a question that:
1. Asks about a specific project or technology they have worked on
2. Tests their understanding of their own code
3. Is relevant to the job they're applying for

Return ONLY a JSON object with this exact structure (no other text):
{{
    "title": "Question title (max 50 chars)",
    "description": "Question description (200-300 chars) - asking about specific repo/project"
}}
"""

    try:
        # Try OpenAI format first
        if hasattr(llm, 'client') and hasattr(llm.client, 'chat'):
            response = llm.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=500
            )
            result_text = response.choices[0].message.content
        else:
            # Fallback to Ollama format
            result_text = llm._generate_ollama(prompt, [])

        # Parse JSON from response
        result_text = result_text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]

        question_data = json.loads(result_text.strip())

        return {
            "id": 4,
            "type": "github",
            "title": question_data.get("title", "About Your Project"),
            "description": question_data.get("description", "Tell us about one of your projects."),
            "repo_data": {
                "username": github_data.username,
                "repositories": github_data.repositories[:3]
            }
        }
    except Exception as e:
        logger.error(f"Error generating Q4: {e}")
        # Fallback question
        return {
            "id": 4,
            "type": "github",
            "title": "About Your Best Project",
            "description": f"Tell us about one of your GitHub projects. What was the most challenging part?",
            "repo_data": {
                "username": github_data.username,
                "repositories": github_data.repositories[:3]
            }
        }


async def generate_q5_from_jd(job_description: str) -> Dict:
    """Generate Q5 question from job description using LLM."""
    llm = get_llm_service()

    jd_context = job_description[:2000] if job_description else "Software Engineering position"

    prompt = f"""Based on the job description, generate a situational/behavioral question.

Job Description (first 2000 chars):
{jd_context}

Generate a question that:
1. Tests soft skills or problem-solving approach
2. Is relevant to the job requirements
3. Has no single correct answer - tests thinking process

Return ONLY a JSON object with this exact structure (no other text):
{{
    "title": "Question title (max 50 chars)",
    "description": "Question description (200-300 chars)"
}}
"""

    try:
        if hasattr(llm, 'client') and hasattr(llm.client, 'chat'):
            response = llm.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=500
            )
            result_text = response.choices[0].message.content
        else:
            result_text = llm._generate_ollama(prompt, [])

        # Parse JSON from response
        result_text = result_text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]

        question_data = json.loads(result_text.strip())

        return {
            "id": 5,
            "type": "jd",
            "title": question_data.get("title", "Problem Solving"),
            "description": question_data.get("description", "Describe how you would handle a challenging situation.")
        }
    except Exception as e:
        logger.error(f"Error generating Q5: {e}")
        # Fallback question
        return {
            "id": 5,
            "type": "jd",
            "title": "Problem Solving",
            "description": "Describe a challenging technical problem you faced and how you solved it."
        }


# ====================
# API Endpoints
# ====================


@router.post("/generate", response_model=InterviewGenerateResponse)
async def generate_interview(request: InterviewGenerateRequest):
    """
    Generate a 5-question interview.

    Q1: 1 EASY problem from problems.json
    Q2: 1 MEDIUM problem from problems.json
    Q3: 1 MEDIUM problem from problems.json (different from Q2)
    Q4: Generated from pre-fetched GitHub profile data
    Q5: Generated from job description
    """
    problems = load_problems()

    if not problems:
        raise HTTPException(
            status_code=500,
            detail="Problems not loaded. Run setup_db.py first."
        )

    # Filter by difficulty
    easy_problems = [p for p in problems if p.get("difficulty") == "easy"]
    medium_problems = [p for p in problems if p.get("difficulty") == "medium"]

    if not easy_problems:
        raise HTTPException(status_code=500, detail="No EASY problems available")
    if len(medium_problems) < 2:
        raise HTTPException(status_code=500, detail="Not enough MEDIUM problems")

    import random
    random.seed()

    # Select Q1 (EASY)
    q1 = random.choice(easy_problems)

    # Select Q2 and Q3 (MEDIUM) - different problems
    medium_sample = random.sample(medium_problems, 2)
    q2, q3 = medium_sample

    questions = [
        {
            "id": 1,
            "type": "code",
            "difficulty": "easy",
            "title": q1.get("title", f"Problem {q1.get('id')}"),
            "description": q1.get("description", ""),
            "test_cases": q1.get("test_cases", [])
        },
        {
            "id": 2,
            "type": "code",
            "difficulty": "medium",
            "title": q2.get("title", f"Problem {q2.get('id')}"),
            "description": q2.get("description", ""),
            "test_cases": q2.get("test_cases", [])
        },
        {
            "id": 3,
            "type": "code",
            "difficulty": "medium",
            "title": q3.get("title", f"Problem {q3.get('id')}"),
            "description": q3.get("description", ""),
            "test_cases": q3.get("test_cases", [])
        }
    ]

    # Generate Q4 from GitHub data
    if request.github_profile_data:
        q4 = await generate_q4_from_github(request.github_profile_data)
    else:
        # Fallback if no GitHub data
        q4 = {
            "id": 4,
            "type": "github",
            "title": "About Your Experience",
            "description": "Tell us about your programming experience and projects.",
            "repo_data": {}
        }
    questions.append(q4)

    # Generate Q5 from JD
    if request.job_description:
        q5 = await generate_q5_from_jd(request.job_description)
    else:
        # Fallback if no JD
        q5 = {
            "id": 5,
            "type": "jd",
            "title": "Problem Solving",
            "description": "Describe a challenging technical problem you faced and how you solved it."
        }
    questions.append(q5)

    logger.info(f"Generated interview for {request.candidate_name} with 5 questions")

    return InterviewGenerateResponse(
        candidate_name=request.candidate_name,
        questions=questions
    )


@router.post("/execute_code", response_model=ExecuteCodeResponse)
async def execute_code(request: ExecuteCodeRequest):
    """
    Execute user code against test cases using Piston API.

    Uses https://emkc.org/api/v2/piston/execute
    """
    import httpx

    problems = load_problems()

    # Find the problem
    problem = None
    for p in problems:
        if p.get("id") == request.problem_id:
            problem = p
            break

    if not problem:
        raise HTTPException(
            status_code=404,
            detail=f"Problem with id {request.problem_id} not found"
        )

    test_cases = problem.get("test_cases", [])
    if not test_cases:
        raise HTTPException(status_code=400, detail="No test cases for this problem")

    results = []
    passed_count = 0

    # Piston API endpoint
    piston_url = "https://emkc.org/api/v2/piston/execute"

    async with httpx.AsyncClient(timeout=30.0) as client:
        for idx, tc in enumerate(test_cases):
            try:
                # Prepare code with input
                full_code = f"""import sys
import json

# User's code
{request.user_code}

# Test input
test_input = {repr(tc['input'])}

# Run solution
if __name__ == "__main__":
    import io
    sys.stdin = io.StringIO(test_input)
    solution()
"""
                # Execute via Piston
                response = await client.post(
                    piston_url,
                    json={
                        "language": "python",
                        "version": "3.10.0",
                        "files": [{"content": full_code}],
                        "run_timeout": 10000
                    }
                )

                if response.status_code != 200:
                    results.append(TestResult(
                        test_case=idx + 1,
                        passed=False,
                        input=tc.get("input", ""),
                        expected=tc.get("expected_output", ""),
                        actual="",
                        error=f"Piston API error: {response.status_code}"
                    ))
                    continue

                result_data = response.json()
                run_result = result_data.get("run", {})

                # Get output
                stdout = run_result.get("stdout", "")
                stderr = run_result.get("stderr", "")

                if stderr:
                    results.append(TestResult(
                        test_case=idx + 1,
                        passed=False,
                        input=tc.get("input", ""),
                        expected=tc.get("expected_output", ""),
                        actual=stdout,
                        error=stderr
                    ))
                    continue

                # Compare output (normalize whitespace)
                actual_normalized = stdout.strip()
                expected_normalized = tc.get("expected_output", "").strip()

                passed = actual_normalized == expected_normalized
                if passed:
                    passed_count += 1

                results.append(TestResult(
                    test_case=idx + 1,
                    passed=passed,
                    input=tc.get("input", ""),
                    expected=tc.get("expected_output", ""),
                    actual=stdout,
                    error=None
                ))

            except Exception as e:
                logger.error(f"Error executing test case {idx + 1}: {e}")
                results.append(TestResult(
                    test_case=idx + 1,
                    passed=False,
                    input=tc.get("input", ""),
                    expected=tc.get("expected_output", ""),
                    actual="",
                    error=str(e)
                ))

    # Calculate pass percentage
    pass_percentage = (passed_count / len(test_cases)) * 100 if test_cases else 0

    # Calculate complexity (optional - using simple line count as proxy)
    complexity = None
    try:
        # Simple complexity estimation based on code length
        code_lines = len([l for l in request.user_code.split('\n') if l.strip()])
        complexity = min(10, max(1, code_lines // 10))
    except:
        pass

    return ExecuteCodeResponse(
        problem_id=request.problem_id,
        pass_percentage=round(pass_percentage, 1),
        complexity=complexity,
        test_results=results
    )


@router.post("/evaluate_writing", response_model=EvaluateWritingResponse)
async def evaluate_writing(request: EvaluateWritingRequest):
    """
    Evaluate a written answer using OpenAI.

    Returns a score (1-10) and 2-sentence feedback.
    """
    llm = get_llm_service()

    prompt = f"""You are evaluating a candidate's answer to a technical interview question.

Question: {request.question_text}

Candidate's Answer: {request.user_answer}

Evaluate the answer based on:
1. Relevance to the question
2. Depth of understanding
3. Clarity of communication
4. Technical accuracy (if applicable)

Provide a score from 1-10 and 2 sentences of feedback.

Return ONLY a JSON object with this exact structure (no other text):
{{
    "score": <number 1-10>,
    "feedback": "<2 sentences of constructive feedback>"
}}
"""

    try:
        if hasattr(llm, 'client') and hasattr(llm.client, 'chat'):
            response = llm.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=300
            )
            result_text = response.choices[0].message.content
        else:
            result_text = llm._generate_ollama(prompt, [])

        # Parse JSON from response
        result_text = result_text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]

        eval_data = json.loads(result_text.strip())

        score = int(eval_data.get("score", 5))
        score = max(1, min(10, score))  # Clamp to 1-10

        feedback = str(eval_data.get("feedback", "Good effort."))

        return EvaluateWritingResponse(
            score=score,
            feedback=feedback
        )

    except Exception as e:
        logger.error(f"Error evaluating writing: {e}")
        # Fallback evaluation
        answer_length = len(request.user_answer.split())
        score = min(10, max(1, answer_length // 20))

        return EvaluateWritingResponse(
            score=score,
            feedback="Answer received. Please expand on your response with more specific details."
        )


@router.get("/problems")
async def get_problems():
    """Get list of available problems (for debugging)."""
    problems = load_problems()
    return {
        "total": len(problems),
        "easy": len([p for p in problems if p.get("difficulty") == "easy"]),
        "medium": len([p for p in problems if p.get("difficulty") == "medium"]),
        "hard": len([p for p in problems if p.get("difficulty") == "hard"]),
        "problems": problems
    }