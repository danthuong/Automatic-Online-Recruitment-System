  # CV-JD Matching API Documentation

## Overview

The CV-JD Matching service compares a candidate's CV with a job description to compute match scores using AI (OpenAI gpt-4o-mini).

---

## Endpoints

### 1. Match CV to Job (from Database)

Compare candidate's parsed CV with job description using data from MongoDB.

**Endpoint:** `POST /api/matching/cv-jd`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (optional)
```

**Request Body:**
```json
{
  "candidateId": "string",
  "jobId": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| candidateId | string | Yes | MongoDB ObjectId of candidate |
| jobId | string | Yes | MongoDB ObjectId of job |

**Response (200 OK):**
```json
{
  "candidateId": "string",
  "jobId": "string",
  "candidateName": "string",
  "jobTitle": "string",
  "overallScore": 85,
  "skillMatchScore": 90,
  "experienceMatchScore": 80,
  "educationMatchScore": 75,
  "skillGaps": ["skill1", "skill2"],
  "strengths": ["skill3", "skill4"],
  "matchedPreferredSkills": ["skill5"],
  "llmFeedback": "string"
}
```

| Field | Type | Description |
|-------|------|-------------|
| overallScore | int | Weighted average (0-100) |
| skillMatchScore | int | Skills match percentage (0-100) |
| experienceMatchScore | int | Experience match percentage (0-100) |
| educationMatchScore | int | Education match percentage (0-100) |
| skillGaps | string[] | Skills required by job that candidate lacks |
| strengths | string[] | Skills candidate has that match job requirements |
| matchedPreferredSkills | string[] | Preferred skills candidate possesses |
| llmFeedback | string | AI-generated summary |

**Error Responses:**
- `400`: CV not parsed / Invalid input
- `404`: Candidate or Job not found
- `503`: Service unavailable

---

### 2. Match CV PDF to Job PDF (Direct Upload)

Compare candidate's CV PDF with job description PDF. No database required.

**Endpoint:** `POST /api/matching/cv-jd/pdf`

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cvFile | file | Yes | PDF file of candidate's CV |
| jobFile | file | Yes | PDF file of job description |

**Response (200 OK):**
```json
{
  "candidateName": "string",
  "jobTitle": "string",
  "overallScore": 85,
  "skillMatchScore": 90,
  "experienceMatchScore": 80,
  "educationMatchScore": 75,
  "skillGaps": ["skill1", "skill2"],
  "strengths": ["skill3", "skill4"],
  "matchedPreferredSkills": ["skill5"],
  "llmFeedback": "string",
  "parsedCV": {
    "name": "string",
    "skills": ["Python", "JavaScript"],
    "experience_years": 5,
    "education": [{"degree": "BS CS", "institution": "FPT", "year": "2019"}],
    "projects": [{"name": "Project A", "description": "...", "technologies": ["React"]}],
    "work_experience": [...]
  },
  "parsedJob": {
    "title": "string",
    "required_skills": ["React", "TypeScript"],
    "preferred_skills": ["Next.js"],
    "responsibilities": [...],
    "experience_level": "senior"
  }
}
```

---

### 3. Health Check

**Endpoint:** `GET /api/matching/health`

**Response:**
```json
{
  "status": "healthy",
  "service": "matching"
}
```

---

## Mock Data

### Test Data (when MOCK_API=true)

**Candidate (test-candidate-1):**
```json
{
  "parsedCvData": {
    "skills": ["JavaScript", "React", "Node.js", "TypeScript"],
    "experience_years": 3,
    "education": [{"degree": "Bachelor of CS", "institution": "FPT University", "year": "2021"}],
    "projects": [
      {"name": "E-commerce Platform", "description": "Built with React & Node.js", "technologies": ["React", "Node.js"]}
    ],
    "work_experience": [
      {"title": "Frontend Developer", "company": "Tech Corp", "duration": "2 years", "description": "Built web apps"}
    ]
  }
}
```

**Job (test-job-1):**
```json
{
  "title": "Senior Frontend Developer",
  "requiredSkills": ["React", "TypeScript", "JavaScript", "CSS"],
  "preferredSkills": ["Next.js", "GraphQL", "Testing"],
  "experienceLevel": "senior",
  "description": "We are looking for a Senior Frontend Developer..."
}
```

---

## Testing

### Using Web Portal (Recommended)

1. Start backend: `cd backend && uvicorn app.main:app --port 8000`
2. Start web portal: `cd web-portal && npm run dev`
3. Open http://localhost:3002/matching
4. Select "Upload PDFs (Test Mode)"
5. Upload CV and Job Description PDFs
6. Click "Match CV with Job"

### Using cURL

**Match from PDFs:**
```bash
curl -X POST http://localhost:8000/api/matching/cv-jd/pdf \
  -F "cvFile=@/path/to/cv.pdf" \
  -F "jobFile=@/path/to/job.pdf"
```

**Match from Database (Mock Mode):**
```bash
MOCK_API=true cd backend && uvicorn app.main:app --port 8000

curl -X POST http://localhost:8000/api/matching/cv-jd \
  -H "Content-Type: application/json" \
  -d '{"candidateId": "test-candidate-1", "jobId": "test-job-1"}'
```

### Sample PDF Files

Use any standard CV and job description PDFs. The service will:
1. Extract text from PDFs using pypdf
2. Parse structured data (skills, experience, education) using LLM
3. Compare and generate match scores

---

## Scoring Algorithm

**Overall Score = (skillMatchScore × 0.5) + (experienceMatchScore × 0.3) + (educationMatchScore × 0.2)**

| Score Range | Label | Color |
|-------------|-------|-------|
| 80-100 | Excellent | Green |
| 60-79 | Good | Yellow |
| 0-59 | Needs Improvement | Red |

---

## Error Handling

| Error | Status Code | Cause |
|-------|-------------|-------|
| CV not parsed | 400 | Candidate has no parsedCvData in database |
| Candidate not found | 404 | Invalid candidateId |
| Job not found | 404 | Invalid jobId |
| Service unavailable | 503 | LLM or API failure |

---

## Integration Notes

- Uses OpenAI gpt-4o-mini for LLM analysis
- Requires `python-multipart` for file uploads
- Requires `pypdf` for PDF text extraction
- Token usage: ~1,000 tokens per match → ~$0.0006