# CV-JD Matching & Question Generation - Testing Guide

## Current Status

✅ **All services running:**
- MongoDB (Docker): `localhost:27017`
- Node.js API: `localhost:5001`
- FastAPI: `localhost:8000`
- Next.js Web Portal: `localhost:3002`

---

## Testing Methods

### Method 1: Web Portal (PDF Upload - No Database Required)

The easiest way to test without setting up the database.

**Start services:**
```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --port 8000

# Terminal 2: Start web portal
cd web-portal
npm run dev
```

**Access portal:** http://localhost:3002

**Test CV-JD Matching:**
1. Go to `/matching`
2. Select "Upload PDFs (Test Mode)"
3. Upload CV PDF and Job Description PDF
4. Click "Match CV with Job"
5. View results with scores, skill gaps, strengths

**Test Question Generation:**
1. Go to `/questions`
2. Select "Upload CV PDF (Test Mode)"
3. Upload CV PDF
4. Click "Generate Questions"
5. View generated coding and essay questions

---

### Method 2: API with PDF Files (cURL)

**Test CV-JD Matching from PDFs:**
```bash
curl -X POST http://localhost:8000/api/matching/cv-jd/pdf \
  -F "cvFile=@/path/to/cv.pdf" \
  -F "jobFile=@/path/to/job.pdf"
```

**Test Question Generation from PDF:**
```bash
curl -X POST http://localhost:8000/api/questions/generate/pdf \
  -F "cvFile=@/path/to/cv.pdf"
```

---

### Method 3: API with Database IDs (Requires MongoDB)

**Start services with mock mode:**
```bash
cd backend
MOCK_API=true uvicorn app.main:app --reload --port 8000
```

**Test CV-JD Matching:**
```bash
curl -X POST http://localhost:8000/api/matching/cv-jd \
  -H "Content-Type: application/json" \
  -d '{"candidateId": "test-candidate-1", "jobId": "test-job-1"}'
```

**Test Question Generation:**
```bash
curl -X POST http://localhost:8000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"candidateId": "test-candidate-1"}'
```

---

## Services Running

| Service | Port | URL |
|---------|------|-----|
| MongoDB | 27017 | `docker run -p 27017:27017 mongo:7` |
| Node.js API | 5001 | `PORT=5001 npm run dev` |
| FastAPI | 8000 | `uvicorn app.main:app --port 8000` |
| Next.js | 3002 | `npm run dev` |

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lotushack.com | Admin123! |
| HR | hr@lotushack.com | Hr123456! |
| Candidate | candidate1@test.com | Candidate123! |

---

## Mock Data

When `MOCK_API=true` is set, the API client returns:

**Candidate (test-candidate-1):**
- Skills: JavaScript, React, Node.js, TypeScript
- Experience: 3 years
- Education: FPT University

**Job (test-job-1):**
- Title: Senior Frontend Developer
- Required Skills: React, TypeScript, JavaScript, CSS
- Preferred Skills: Next.js, GraphQL, Testing

---

## API Endpoints

| Method | Endpoint | Description | Input |
|--------|----------|-------------|-------|
| POST | `/api/matching/cv-jd` | Match CV to JD (from DB) | JSON `{candidateId, jobId}` |
| POST | `/api/matching/cv-jd/pdf` | Match CV PDF to JD PDF | Form Data (PDF files) |
| POST | `/api/questions/generate` | Generate questions (from DB) | JSON `{candidateId}` |
| POST | `/api/questions/generate/pdf` | Generate questions from CV PDF | Form Data (PDF file) |
| GET | `/api/matching/health` | Health check | - |
| GET | `/api/questions/health` | Health check | - |

---

## Cost Estimation (OpenAI gpt-4o-mini)

| Operation | Tokens | Cost |
|-----------|--------|------|
| CV parsing | ~2,000 | $0.0012 |
| JD parsing | ~1,500 | $0.0009 |
| CV-JD matching | ~1,000 | $0.0006 |
| Question generation (5 Qs) | ~3,000 | $0.0018 |
| **Total per candidate** | ~7,500 | **$0.0045** |

**With $100 credit:** ~22,000 candidate assessments

---

## Configuration

**Environment variables (backend/.env):**
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
```

---

## Files Changed

| File | Change |
|------|--------|
| `backend/app/core/config.py` | Set default model to gpt-4o-mini |
| `backend/app/services/pdf_parser_service.py` | PDF text extraction + LLM parsing |
| `backend/app/services/matching_service.py` | Added PDF matching support |
| `backend/app/api/matching.py` | Added `/cv-jd/pdf` endpoint |
| `backend/app/services/question_generation_service.py` | Added PDF question generation |
| `backend/app/api/question_gen.py` | Added `/generate/pdf` endpoint |
| `web-portal/src/pages/matching.tsx` | PDF upload UI |
| `web-portal/src/pages/questions.tsx` | PDF upload UI |