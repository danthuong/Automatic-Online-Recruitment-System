# Backend FastAPI Services API Documentation

**Automatic Online Recruitment System**
**Version:** 2.0.0
**Base URL:** `http://localhost:8000`

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Authentication](#authentication)
- [AI Interviewer](#ai-interviewer)
- [GitHub Profile & Evaluation](#github-profile--evaluation)
- [Repository Evaluation](#repository-evaluation)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Setup & Running](#setup--running)

---

## Overview

This document describes the FastAPI backend endpoints that provide:

1. **AI Interviewer**: Real-time chat assistance during coding exams
2. **GitHub Profile Fetch**: Scrapes candidate GitHub profiles using TinyFish
3. **Repository Evaluation**: AI-powered code quality assessment

---

## Tech Stack

- **Runtime:** Python 3.10+
- **Framework:** FastAPI
- **LLM Providers:** Ollama (local), OpenAI, Anthropic, MiniMax, OpenRouter
- **Web Scraping:** TinyFish (for GitHub profile scraping)
- **Storage:** In-memory (MVP), PostgreSQL (production)

---

## Authentication

Currently, the FastAPI endpoints do not require authentication (development mode).

For production, add JWT validation similar to the Node.js backend.

---

## AI Interviewer

Provides real-time chat assistance to candidates during coding exams. Features:
- Chat with AI interviewer
- Request progressive hints
- Submit evaluation metrics
- Health check for LLM provider

### Endpoints

#### `POST /api/interviewer/chat`

Process a chat message from a candidate.

**Request Body:**

```json
{
  "question_id": "q1",
  "message": "Can you give me a hint?",
  "context": {
    "question_text": "Two Sum - Given an array of integers...",
    "difficulty": "easy",
    "constraints": "2 <= nums.length <= 10^4",
    "input_format": "List of integers",
    "output_format": "List of indices"
  },
  "conversation_history": [
    {"role": "user", "content": "I don't know where to start"},
    {"role": "assistant", "content": "Have you considered using a hash map?"}
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question_id` | string | Yes | ID of the current question |
| `message` | string | Yes | User's message |
| `context` | object | Yes | Question context (text, constraints, format) |
| `conversation_history` | array | No | Previous messages |
| `attempt_history` | array | No | Previous code attempts |

**Response (200):**

```json
{
  "reply": "Have you considered using a hash map to track values you've seen?",
  "type": "hint",
  "suggested_time": 300
}
```

---

#### `POST /api/interviewer/hint`

Request a progressive hint for the current question.

**Request Body:**

```json
{
  "question_id": "q1",
  "hint_level": 1,
  "context": {
    "question_text": "Two Sum",
    "difficulty": "easy",
    "constraints": "2 <= nums.length <= 10^4"
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `question_id` | string | Required | Current question ID |
| `hint_level` | int | 1 | Hint level (1=general, 2=specific, 3=near-solution) |
| `context` | object | Required | Question context |

**Response (200):**

```json
{
  "reply": "Think about what data structure can help you find complement values in O(1) time.",
  "type": "hint",
  "suggested_time": 300
}
```

---

#### `POST /api/interviewer/evaluate`

Submit evaluation data from the exam session. Used for HR reporting.

**Request Body:**

```json
{
  "question_id": "q1",
  "clarification_count": 3,
  "time_to_first_hint": 120,
  "question_types": ["clarification", "hint"],
  "hint_dependency_level": 2
}
```

| Field | Type | Description |
|-------|------|-------------|
| `question_id` | string | Question ID |
| `clarification_count` | int | Number of clarification questions asked |
| `time_to_first_hint` | int | Seconds until first hint requested |
| `question_types` | array | Types of questions asked |
| `hint_dependency_level` | int | How much candidate relied on hints (1-3) |

**Response (200):**

```json
{
  "status": "received",
  "question_id": "q1",
  "metrics": {
    "clarification_questions": 3,
    "time_to_first_hint_seconds": 120,
    "question_types": ["clarification", "hint"],
    "hint_dependency": 2
  }
}
```

---

#### `GET /api/interviewer/ping`

Health check endpoint to verify LLM provider connectivity.

**Response (200):**

```json
{
  "status": "ok",
  "service": "interviewer"
}
```

---

## GitHub Profile & Evaluation

Fetches candidate GitHub profiles and evaluates their top repositories.

### Endpoints

#### `POST /api/github/profile`

Fetch a GitHub user profile and trigger evaluations for top repositories.

**Request Body:**

```json
{
  "username": "caoTayTang",
  "max_repos": 10
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `username` | string | Required | GitHub username (without @) |
| `max_repos` | int | 10 | Max repos to fetch (sorted by stars) |

**Response (200):**

```json
{
  "profile": {
    "username": "caoTayTang",
    "avatar_url": "https://avatars.githubusercontent.com/u/...",
    "bio": "Full-stack developer",
    "location": "Ho Chi Minh City",
    "name": "Tai Cao",
    "public_repos": 25,
    "followers": 120,
    "following": 45,
    "repositories": [
      {
        "name": "lotus-backend",
        "full_name": "caoTayTang/lotus-backend",
        "url": "https://github.com/caoTayTang/lotus-backend",
        "description": "Backend API for recruitment system",
        "stars": 45,
        "forks": 12,
        "language": "Python",
        "updated_at": "2 days ago",
        "topics": ["fastapi", "python"],
        "evaluation_id": "uuid-1234-...",
        "evaluation_status": "pending"
      }
    ]
  },
  "evaluation_ids": ["uuid-1234-...", "uuid-5678-..."],
  "message": "Profile fetched. 10 evaluations started in background."
}
```

**Notes:**
- Uses TinyFish to scrape GitHub profile
- Returns ALL repositories, sorted by stars
- Triggers background evaluations for top N repos
- Evaluation runs asynchronously in ThreadPoolExecutor

---

#### `GET /api/github/profile/{username}`

Get a GitHub profile with evaluation results.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `username` | string | GitHub username |

**Response (200):**

```json
{
  "username": "caoTayTang",
  "profile": {
    "username": "caoTayTang",
    "repositories": [
      {
        "name": "lotus-backend",
        "full_name": "caoTayTang/lotus-backend",
        "evaluation_status": "completed",
        "overall_score": 78.5,
        "code_quality_score": 80,
        "documentation_score": 75,
        "best_practices_score": 85,
        "tech_stack_score": 70,
        "testing_score": 60,
        "security_score": 90,
        "architecture_score": 80,
        "strengths": ["Clean code structure", "Good documentation"],
        "weaknesses": ["Missing unit tests"],
        "recommendations": ["Add test coverage"]
      }
    ]
  },
  "total_repos": 25,
  "evaluated_repos": 10
}
```

---

#### `POST /api/github/profile/{username}/evaluate`

Trigger evaluations for a user's top repositories (re-run failed evaluations).

**Path Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `username` | string | Required | GitHub username |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `max_repos` | int | 10 | Number of repos to evaluate |

**Response (200):**

```json
{
  "message": "Created 3 new evaluations",
  "evaluation_ids": ["uuid-1234-...", "uuid-5678-..."]
}
```

---

#### `GET /api/github/profile/{username}/evaluations`

Get all evaluations for a user's repositories.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `username` | string | GitHub username |

**Response (200):**

```json
{
  "username": "caoTayTang",
  "evaluations": [
    {
      "id": "uuid-1234-...",
      "username": "caoTayTang",
      "repo_url": "https://github.com/caoTayTang/lotus-backend",
      "status": "completed",
      "overall_score": 78.5,
      "created_at": "2026-03-21T10:00:00",
      "completed_at": "2026-03-21T10:05:00"
    }
  ],
  "total": 10
}
```

---

#### `GET /api/github/evaluations/{evaluation_id}`

Get a specific evaluation by ID.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `evaluation_id` | string | Evaluation UUID |

**Response (200):**

```json
{
  "id": "uuid-1234-...",
  "username": "caoTayTang",
  "repo_url": "https://github.com/caoTayTang/lotus-backend",
  "status": "completed",
  "code_quality_score": 80,
  "documentation_score": 75,
  "best_practices_score": 85,
  "tech_stack_score": 70,
  "testing_score": 60,
  "security_score": 90,
  "architecture_score": 80,
  "overall_score": 78.5,
  "strengths": ["Clean code structure", "Good documentation"],
  "weaknesses": ["Missing unit tests"],
  "recommendations": ["Add test coverage", "Implement CI/CD"],
  "tech_stack_detected": ["Python", "FastAPI", "PostgreSQL"],
  "created_at": "2026-03-21T10:00:00",
  "completed_at": "2026-03-21T10:05:00"
}
```

---

#### `POST /api/github/evaluate-repo`

Evaluate a single repository by full name.

**Request Body:**

```json
{
  "repo_full_name": "caoTayTang/some-repo",
  "repo_url": "https://github.com/caoTayTang/some-repo"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `repo_full_name` | string | Yes | Owner/repo format |
| `repo_url` | string | Yes | Full GitHub URL |

**Response (200):**

```json
{
  "message": "Evaluation started",
  "evaluation_id": "uuid-1234-...",
  "repo_full_name": "caoTayTang/some-repo"
}
```

---

## Repository Evaluation

Direct endpoints for repository evaluation (without GitHub profile).

### Endpoints

#### `POST /api/evaluations`

Start a new repository evaluation.

**Request Body:**

```json
{
  "repo_url": "https://github.com/caoTayTang/lotus-backend"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `repo_url` | string | Yes | GitHub repository URL (must start with https://github.com/) |

**Response (201):**

```json
{
  "id": "uuid-1234-...",
  "status": "pending",
  "message": "Evaluation started. Use GET endpoint to check status."
}
```

---

#### `GET /api/evaluations`

List all repository evaluations with pagination.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | - | Filter by status: pending, processing, completed, failed |
| `limit` | int | 50 | Max results (1-100) |
| `offset` | int | 0 | Results to skip |

**Response (200):**

```json
{
  "evaluations": [
    {
      "id": "uuid-1234-...",
      "repo_url": "https://github.com/caoTayTang/lotus-backend",
      "status": "completed",
      "overall_score": 78.5,
      "created_at": "2026-03-21T10:00:00"
    }
  ],
  "total": 25
}
```

---

#### `GET /api/evaluations/{evaluation_id}`

Get a specific evaluation by ID.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `evaluation_id` | string | Evaluation UUID |

**Response (200):**

```json
{
  "id": "uuid-1234-...",
  "username": "caoTayTang",
  "repo_url": "https://github.com/caoTayTang/lotus-backend",
  "status": "completed",
  "code_quality_score": 80,
  "documentation_score": 75,
  "best_practices_score": 85,
  "tech_stack_score": 70,
  "testing_score": 60,
  "security_score": 90,
  "architecture_score": 80,
  "overall_score": 78.5,
  "strengths": ["Clean code structure", "Good documentation"],
  "weaknesses": ["Missing unit tests"],
  "recommendations": ["Add test coverage"],
  "tech_stack_detected": ["Python", "FastAPI", "PostgreSQL"],
  "evaluation_details": {},
  "created_at": "2026-03-21T10:00:00",
  "completed_at": "2026-03-21T10:05:00"
}
```

---

#### `DELETE /api/evaluations/{evaluation_id}`

Delete an evaluation by ID.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `evaluation_id` | string | Evaluation UUID |

**Response (200):**

```json
{
  "message": "Evaluation deleted successfully",
  "id": "uuid-1234-..."
}
```

---

#### `GET /api/evaluations/{evaluation_id}/status`

Get just the status of an evaluation (lightweight endpoint).

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `evaluation_id` | string | Evaluation UUID |

**Response (200):**

```json
{
  "id": "uuid-1234-...",
  "status": "completed",
  "overall_score": 78.5,
  "created_at": "2026-03-21T10:00:00",
  "completed_at": "2026-03-21T10:05:00"
}
```

---

## Data Models

### EvaluationStatus

| Value | Description |
|-------|-------------|
| `pending` | Evaluation created, not yet started |
| `processing` | Evaluation in progress |
| `completed` | Evaluation finished successfully |
| `failed` | Evaluation failed (check error_message) |

### RepoEvaluation

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `username` | string | GitHub username |
| `repo_url` | string | Repository URL |
| `status` | EvaluationStatus | Current status |
| `code_quality_score` | float | Code quality (0-100) |
| `documentation_score` | float | Documentation (0-100) |
| `best_practices_score` | float | Best practices (0-100) |
| `tech_stack_score` | float | Tech stack (0-100) |
| `testing_score` | float | Testing coverage (0-100) |
| `security_score` | float | Security (0-100) |
| `architecture_score` | float | Architecture (0-100) |
| `overall_score` | float | Weighted average (0-100) |
| `strengths` | array | List of strengths |
| `weaknesses` | array | List of weaknesses |
| `recommendations` | array | Improvement recommendations |
| `tech_stack_detected` | array | Detected technologies |
| `created_at` | datetime | Creation timestamp |
| `completed_at` | datetime | Completion timestamp |
| `error_message` | string | Error if failed |

### GitHubRepo

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Repository name |
| `full_name` | string | owner/repo |
| `url` | string | GitHub URL |
| `description` | string | Repository description |
| `stars` | int | Star count |
| `forks` | int | Fork count |
| `language` | string | Primary language |
| `updated_at` | string | Last update (relative) |
| `topics` | array | Repository topics |
| `evaluation_id` | string | Evaluation UUID |
| `evaluation_status` | EvaluationStatus | Status |
| `overall_score` | float | Score (0-100) |

### UserGitHubProfile

| Field | Type | Description |
|-------|------|-------------|
| `username` | string | GitHub username |
| `avatar_url` | string | Profile avatar URL |
| `bio` | string | Profile bio |
| `location` | string | Location |
| `name` | string | Display name |
| `public_repos` | int | Public repository count |
| `followers` | int | Follower count |
| `following` | int | Following count |
| `repositories` | array | List of GitHubRepo |

---

## Error Handling

All errors return a consistent format:

```json
{
  "detail": "Error description"
}
```

### Error Codes

| HTTP Code | Description |
|-----------|-------------|
| 400 | Invalid request body or parameters |
| 404 | Resource not found |
| 500 | Internal server error |
| 503 | Service unavailable (e.g., TinyFish not configured) |

---

## Setup & Running

### Prerequisites

- Python 3.10+
- TinyFish API key (for GitHub scraping)
- Ollama running locally (for local LLM)
- Or: OpenAI/Anthropic/MiniMax API keys

### Environment Variables

Create `backend/.env`:

```env
# LLM Provider: ollama, openai, anthropic, minimax
LLM_PROVIDER=ollama

# Ollama settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b

# TinyFish (for GitHub scraping)
TINYFISH_API_KEY=sk-tinyfish-...

# Optional: OpenAI
# OPENAI_API_KEY=sk-...

# Optional: Anthropic
# ANTHROPIC_API_KEY=sk-ant-...

# Optional: MiniMax
# MINIMAX_API_KEY=...
```

### Running the Server

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Testing Endpoints

```bash
# AI Interviewer health check
curl http://localhost:8000/api/interviewer/ping

# Fetch GitHub profile
curl -X POST http://localhost:8000/api/github/profile \
  -H "Content-Type: application/json" \
  -d '{"username": "caoTayTang", "max_repos": 5}'

# Get profile with evaluations
curl http://localhost:8000/api/github/profile/caoTayTang

# Create repository evaluation
curl -X POST http://localhost:8000/api/evaluations \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/facebook/react"}'

# Get evaluation status
curl http://localhost:8000/api/evaluations/{evaluation_id}/status
```

### LLM Provider Priority

1. **Ollama** (local) - Default, no API cost
2. **OpenRouter** - Detected by key prefix `sk-or-v1-`
3. **MiniMax** - Uses MiniMax API
4. **OpenAI** - Uses OpenAI API
5. **Anthropic** - Uses Claude API

If primary provider fails, automatically falls back to Ollama.

---

## Architecture

### Flow: GitHub Profile Fetch

```
POST /api/github/profile {username: "user", max_repos: 10}
         ↓
TinyFish scrapes GitHub profile + repos
         ↓
Returns ALL repos (sorted by stars)
         ↓
Background: ThreadPoolExecutor evaluates top N
         ↓
Response: profile + evaluation_ids
```

### Flow: AI Interviewer Chat

```
POST /api/interviewer/chat
         ↓
Validate input (prompt injection detection)
         ↓
Classify message type (hint/clarification/encouragement)
         ↓
Build prompt from template
         ↓
Call LLM (with fallback to Ollama)
         ↓
Filter output (prevent solution leakage)
         ↓
Return response
```

---

*Generated: 2026-03-21*