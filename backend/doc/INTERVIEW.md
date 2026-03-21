# AI Interviewer API Documentation

## Base URL
```
http://localhost:8000/api/interview
```

---

## Endpoints

### 1. Generate Interview
Generate a 5-question interview (Q1-Q3 code, Q4 GitHub essay, Q5 JD essay).

**Endpoint:** `POST /generate`

**Input:**
```json
{
  "candidate_name": "string",
  "github_profile_data": {
    "username": "string",
    "repositories": [{"name": "string", "description": "string", "stars": 0, "language": "string"}],
    "bio": "string",
    "name": "string"
  },
  "job_description": "string"
}
```

**Output:**
```json
{
  "candidate_name": "string",
  "questions": [
    {"id": 1, "type": "code", "difficulty": "easy", "title": "string", "description": "string", "test_cases": [{"input": "string", "expected_output": "string"}]},
    {"id": 2, "type": "code", "difficulty": "medium", "title": "string", "description": "string", "test_cases": [...]},
    {"id": 3, "type": "code", "difficulty": "medium", "title": "string", "description": "string", "test_cases": [...]},
    {"id": 4, "type": "github", "title": "string", "description": "string", "repo_data": {"username": "string", "repositories": [...]}},
    {"id": 5, "type": "jd", "title": "string", "description": "string"}
  ]
}
```

---

### 2. Execute Code
Execute Python code against test cases.

**Endpoint:** `POST /execute_code`

**Input:**
```json
{
  "user_code": "def solution():\n    return 42",
  "problem_id": 1
}
```

**Output:**
```json
{
  "problem_id": 1,
  "pass_percentage": 66.7,
  "complexity": 3,
  "test_results": [
    {"test_case": 1, "passed": true, "input": "string", "expected": "string", "actual": "string", "error": null},
    {"test_case": 2, "passed": false, "input": "string", "expected": "string", "actual": "string", "error": "string"}
  ]
}
```

---

### 3. Evaluate Writing
Evaluate an essay answer using LLM.

**Endpoint:** `POST /evaluate_writing`

**Input:**
```json
{
  "question_text": "Tell us about a challenging project...",
  "user_answer": "I worked on a microservices migration..."
}
```

**Output:**
```json
{
  "score": 8,
  "feedback": "Good depth of technical detail. Consider including more specific metrics."
}
```

---

### 4. Calculate Interview Score
Calculate weighted total score for the interview.

**Endpoint:** `POST /calculate_score`

**Input:**
```json
{
  "q1": {"problem_id": 1, "pass_percentage": 100, "total_tests": 3, "passed_tests": 3},
  "q2": {"problem_id": 2, "pass_percentage": 50, "total_tests": 4, "passed_tests": 2},
  "q3": {"problem_id": 3, "pass_percentage": 0, "total_tests": 2, "passed_tests": 0},
  "q4": {"llm_score": 8},
  "q5": {"llm_score": 7}
}
```

**Output:**
```json
{
  "total_score": 57.5,
  "breakdown": [
    {"question_id": 1, "question_type": "code", "raw_score": 100, "weighted_score": 10},
    {"question_id": 2, "question_type": "code", "raw_score": 50, "weighted_score": 10},
    {"question_id": 3, "question_type": "code", "raw_score": 0, "weighted_score": 0},
    {"question_id": 4, "question_type": "github", "raw_score": 8, "weighted_score": 20},
    {"question_id": 5, "question_type": "jd", "raw_score": 7, "weighted_score": 17.5}
  ],
  "details": {
    "q1": {"difficulty": "easy", "weight": "10%", "passed_tests": 3, "total_tests": 3, "pass_percentage": 100, "weighted_score": 10},
    "q2": {"difficulty": "medium", "weight": "20%", "passed_tests": 2, "total_tests": 4, "pass_percentage": 50, "weighted_score": 10},
    "q3": {"difficulty": "medium", "weight": "20%", "passed_tests": 0, "total_tests": 2, "pass_percentage": 0, "weighted_score": 0},
    "q4": {"type": "github_essay", "weight": "25%", "llm_score": 8, "weighted_score": 20},
    "q5": {"type": "jd_essay", "weight": "25%", "llm_score": 7, "weighted_score": 17.5}
  }
}
```

---

### 5. Get Problems
List available coding problems (for debugging).

**Endpoint:** `GET /problems`

**Output:**
```json
{
  "total": 50,
  "easy": 20,
  "medium": 25,
  "hard": 5,
  "problems": [...]
}
```

---

## Scoring Weights

| Question | Type | Weight | Formula |
|----------|------|--------|---------|
| Q1 | Easy Code | 10% | (passed/total) × 10 |
| Q2 | Medium Code | 20% | (passed/total) × 20 |
| Q3 | Medium Code | 20% | (passed/total) × 20 |
| Q4 | GitHub Essay | 25% | (llm_score/10) × 25 |
| Q5 | JD Essay | 25% | (llm_score/10) × 25 |

---

## Test UI
Access the interview test portal at: `http://localhost:8000/static/interview.html`