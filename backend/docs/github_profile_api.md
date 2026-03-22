# GitHub Profile API Documentation

## Overview

This API fetches GitHub user profiles and automatically evaluates their top repositories using TinyFish for scraping and LLM for code evaluation.

## Base URL

```
http://localhost:8000
```

## Endpoints

### 1. Fetch GitHub Profile

Fetch a GitHub user's profile and start repository evaluations.

**Endpoint:** `POST /api/github/profile`

**Request Body:**
```json
{
  "username": "caoTayTang",
  "max_repos": 10
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | GitHub username (without @) |
| `max_repos` | integer | No | Number of top repos to evaluate (default: 10) |

**Response:**
```json
{
  "profile": {
    "username": "caoTayTang",
    "avatar_url": "https://avatars.githubusercontent.com/u/91472348?v=4",
    "bio": "I'm Lê Chí Đại and currently a student at HCMUT",
    "location": "Vietnam, Ho Chi Minh city",
    "name": "LÊ CHÍ ĐẠI",
    "public_repos": 31,
    "followers": 15,
    "following": 15,
    "repositories": [
      {
        "name": "gradphic",
        "full_name": "caoTayTang/gradphic",
        "url": "https://github.com/caoTayTang/gradphic",
        "description": null,
        "stars": 0,
        "forks": 0,
        "language": "Python",
        "updated_at": "yesterday",
        "topics": [],
        "evaluation_id": "uuid-here",
        "evaluation_status": "pending",
        "overall_score": null
      }
    ]
  },
  "evaluation_ids": ["uuid-1", "uuid-2", ...],
  "message": "Profile fetched. 10 evaluations started in background."
}
```

**Note:** The TinyFish scraping takes ~1-2 minutes. Evaluations run in background.

---

### 2. Get Profile with Evaluation Results

Get a previously fetched profile with evaluation scores (if completed).

**Endpoint:** `GET /api/github/profile/{username}`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username |

**Response:**
```json
{
  "username": "caoTayTang",
  "profile": {
    "username": "caoTayTang",
    "avatar_url": "https://avatars.githubusercontent.com/u/91472348?v=4",
    "bio": "...",
    "repositories": [
      {
        "name": "gradphic",
        "full_name": "caoTayTang/gradphic",
        "url": "https://github.com/caoTayTang/gradphic",
        "stars": 0,
        "language": "Python",
        "evaluation_id": "uuid",
        "evaluation_status": "completed",
        "overall_score": 72.5
      }
    ]
  },
  "total_repos": 10,
  "evaluated_repos": 3
}
```

---

### 3. Get Evaluation Status

Check the status of a specific evaluation.

**Endpoint:** `GET /api/evaluations/{evaluation_id}`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `evaluation_id` | string | UUID of the evaluation |

**Response:**
```json
{
  "id": "uuid-here",
  "repo_url": "https://github.com/caoTayTang/gradphic",
  "status": "completed",
  "created_at": "2026-03-21T10:00:00",
  "completed_at": "2026-03-21T10:02:30",
  "code_quality_score": 75,
  "documentation_score": 60,
  "best_practices_score": 70,
  "tech_stack_score": 80,
  "testing_score": 65,
  "security_score": 85,
  "architecture_score": 72,
  "overall_score": 72.5,
  "strengths": ["Good code structure", "Modern tech stack"],
  "weaknesses": ["Missing tests", "No documentation"],
  "recommendations": ["Add unit tests", "Write README"]
}
```

---

### 4. List All Evaluations

**Endpoint:** `GET /api/evaluations`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (pending, processing, completed, failed) |
| `limit` | int | Max results (default: 50) |
| `offset` | int | Skip results (default: 0) |

---

## Testing with Postman

### Step 1: Start the Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Open Postman

### Step 3: Fetch GitHub Profile

1. **Create new request**
2. **Method:** `POST`
3. **URL:** `http://localhost:8000/api/github/profile`
4. **Headers:** (none needed)
5. **Body:** Select `raw` → `JSON`
   ```json
   {
     "username": "caoTayTang",
     "max_repos": 5
   }
   ```
6. **Send**

**Expected Response:**
```json
{
  "profile": { ... },
  "evaluation_ids": ["uuid1", "uuid2", ...],
  "message": "Profile fetched. 5 evaluations started in background."
}
```

**Note:** This takes ~1-2 minutes due to TinyFish scraping. The response returns quickly but evaluations run in background.

### Step 4: Check Evaluation Status

1. **Create new request**
2. **Method:** `GET`
3. **URL:** `http://localhost:8000/api/evaluations/{evaluation_id}`
   - Replace `{evaluation_id}` with one from the `evaluation_ids` array in previous response
4. **Send**

### Step 5: Get Profile with Results

1. **Create new request**
2. **Method:** `GET`
3. **URL:** `http://localhost:8000/api/github/profile/caoTayTang`
4. **Send**

This shows all repositories with their evaluation status and scores.

---

## Postman Collection

You can import this collection:

```json
{
  "info": {
    "name": "GitHub Profile API",
    "description": "API for fetching GitHub profiles and evaluating repositories"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:8000"
    }
  ],
  "item": [
    {
      "name": "Fetch GitHub Profile",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/github/profile",
        "header": [],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"caoTayTang\",\n  \"max_repos\": 5\n}"
        }
      }
    },
    {
      "name": "Get Profile",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/github/profile/caoTayTang"
      }
    },
    {
      "name": "Get Evaluation",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/evaluations/{evaluation_id}"
      }
    },
    {
      "name": "List Evaluations",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/evaluations?limit=10"
      }
    }
  ]
}
```

---

## Evaluation Status Values

| Status | Description |
|--------|-------------|
| `pending` | Evaluation queued, not started yet |
| `processing` | Currently being evaluated |
| `completed` | Evaluation finished, scores available |
| `failed` | Evaluation failed (check `error_message`) |

---

## Notes

- **TinyFish scraping:** Takes ~1-2 minutes per request
- **Repository evaluation:** Each repo takes ~30-60 seconds
- **Storage:** In-memory (resets when server restarts)
- **API Key:** Make sure `TINYFISH_API_KEY` is set in `.env`