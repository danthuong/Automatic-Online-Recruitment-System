# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-subsystem recruitment platform with AI-powered CV ranking, anti-cheat exam system, and real-time proctoring.

**Tech Stack:**
- Backend: Python FastAPI + Celery
- Web Frontend: Next.js (React)
- Desktop App: Electron + React/Node.js
- Database: PostgreSQL + Redis
- Proctoring: MediaPipe Face Mesh, SpeechRecognition

---

## Common Commands

### Backend (Python/FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
celery -A app.worker.celery_app worker --loglevel=info
pytest tests/ -v
```

### Web Portal (Next.js/React)
```bash
cd web-portal
npm install
npm run dev
npm run build
npm test
```

### Electron Client
```bash
cd electron-client
npm install
npm run dev
npm run build
npm run package
```

### Docker (Full Stack)
```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

## Architecture

### Pipeline Flow
1. **CV Upload & Ranking**: Candidates upload CVs (PDF/Docx) → LLM extracts skills/experience → Scoring function ranks candidates
2. **Queue Management**: Top N candidates pushed to Redis queue → Email invitations sent with Test ID
3. **Exam Session**: Electron app in Kiosk mode → LLM generates dynamic questions based on candidate's CV
4. **AI Proctoring**: MediaPipe Face Mesh tracks gaze → Audio monitoring detects suspicious sounds → Warnings logged
5. **Auto-Grading**: MCQs auto-graded → Essay questions semantically matched against CV → Next candidate pulled from queue

### Key Subsystems

| Subsystem | Responsibility |
|-----------|---------------|
| `web-portal/` | HR dashboard + candidate CV upload |
| `backend/app/api/` | REST endpoints |
| `backend/app/services/` | LLM for CV parsing, ranking, question generation |
| `backend/app/worker/` | Celery tasks for async processing |
| `electron-client/src/main/` | OS-level security (process killer, kiosk mode) |
| `electron-client/src/renderer/` | Exam UI + MediaPipe proctoring |

### API Design
```
POST   /api/candidates          # Create/upload candidate
GET    /api/candidates          # List candidates
POST   /api/tests/generate      # Generate dynamic test
GET    /api/tests/{id}          # Get test for candidate
POST   /api/tests/{id}/submit   # Submit test results
GET    /api/reports/hr          # HR dashboard data
```

---

## Additional Guidelines

See `AGENTS.md` for detailed code style, database conventions, and security considerations.