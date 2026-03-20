# Repo Evaluation Service

Evaluates GitHub repositories for job-seeker assessment using AI-powered code analysis.

## Overview

When a job-seeker submits their CV (which includes a GitHub repo URL), the service evaluates the codebase asynchronously in the background, then provides comprehensive evaluation results for the HR dashboard.

## Quick Start

```bash
# Start the backend
cd backend
uvicorn app.main:app --reload

# Start an evaluation
curl -X POST http://localhost:8000/api/evaluations \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/facebook/react"}'

# Check status
curl http://localhost:8000/api/evaluations/{evaluation_id}
```

## API Endpoints

### POST /api/evaluations

Start a new repository evaluation.

**Request:**
```json
{
  "repo_url": "https://github.com/owner/repo"
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "status": "pending",
  "message": "Evaluation started. Use GET endpoint to check status."
}
```

### GET /api/evaluations

List all evaluations with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by: `pending`, `processing`, `completed`, `failed` |
| limit | int | Max results (1-100, default 50) |
| offset | int | Results to skip for pagination |

**Response:**
```json
{
  "evaluations": [...],
  "total": 10
}
```

### GET /api/evaluations/{id}

Get full evaluation result including scores and feedback.

### GET /api/evaluations/{id}/status

Lightweight endpoint to check just the status.

**Response:**
```json
{
  "id": "uuid-string",
  "status": "completed",
  "overall_score": 87.25,
  "created_at": "2026-03-21T00:00:00",
  "completed_at": "2026-03-21T00:01:30"
}
```

### DELETE /api/evaluations/{id}

Delete an evaluation.

## Evaluation Response

```json
{
  "id": "uuid-string",
  "repo_url": "https://github.com/facebook/react",
  "status": "completed",
  "created_at": "2026-03-21T00:00:00",
  "completed_at": "2026-03-21T00:01:30",

  "code_quality_score": 85.0,
  "documentation_score": 90.0,
  "best_practices_score": 95.0,
  "tech_stack_score": 90.0,
  "testing_score": 85.0,
  "security_score": 80.0,
  "architecture_score": 85.0,
  "overall_score": 87.25,

  "strengths": [
    "Good use of TypeScript for type safety",
    "Comprehensive README with clear documentation"
  ],
  "weaknesses": [
    "Complexity of codebase might be challenging for beginners"
  ],
  "recommendations": [
    "Refactor some complex components for better readability"
  ],
  "tech_stack_detected": ["React", "TypeScript", "Babel", "Webpack"],

  "evaluation_details": {
    "file_count": 6316,
    "total_lines": 674994,
    "languages": {"JavaScript": 3531, "TypeScript": 500},
    "config_files": ["package.json", "tsconfig.json"],
    "has_tests": true,
    "has_docs": true
  }
}
```

## Evaluation Rubric

| Category | Weight | Criteria |
|----------|--------|----------|
| Code Quality | 20% | Naming, complexity, SOLID principles, code smells |
| Documentation | 15% | README, docstrings, inline comments |
| Best Practices | 15% | Linting, formatting, version control, dependency management |
| Tech Stack | 10% | Modern frameworks, appropriate tools |
| Testing | 15% | Test coverage, test quality |
| Security | 10% | Secrets handling, dependencies audit |
| Architecture | 15% | Modular design, separation of concerns |

## Architecture

### Flow
```
1. POST /api/evaluations {repo_url}
   → Returns {evaluation_id, status: "pending"}

2. Background task starts:
   - Clone/fetch repo (git or GitHub API fallback)
   - Analyze file structure
   - Run static analysis
   - Send code to LLM for quality assessment
   - Calculate scores per rubric category

3. Status: pending → processing → completed/failed

4. GET /api/evaluations/{id}
   → Returns full evaluation with scores
```

### Files

| File | Description |
|------|-------------|
| `app/models/evaluations.py` | Data models |
| `app/services/repo_evaluation_service.py` | Core evaluation logic |
| `app/api/repo_evaluation.py` | API endpoints |

### Dependencies

- **httpx**: HTTP client for GitHub API
- **git**: CLI for repository cloning
- **Ollama**: LLM for code analysis (qwen2.5-coder:7b)

## Configuration

The service uses the existing LLM configuration from `app/core/config.py`:

```python
LLM_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5-coder:7b
OLLAMA_BASE_URL=http://localhost:11434
```

## Limitations

- Only public GitHub repositories supported
- Large repositories may take longer to clone/analyze
- Requires git CLI installed on the system
- Falls back to GitHub API if git is unavailable (limited analysis)