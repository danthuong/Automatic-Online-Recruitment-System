# AGENTS.md - Automatic Online Recruitment System

## Project Overview

Multi-subsystem recruitment platform with AI-powered CV ranking, anti-cheat exam system, and real-time proctoring.

**Tech Stack:**
- Backend: Python FastAPI + Celery
- Web Frontend: Next.js (React)
- Desktop App: Electron + React/Node.js
- Database: PostgreSQL + Redis
- Proctoring: MediaPipe Face Mesh, SpeechRecognition

---

## 1. Build/Lint/Test Commands

### Backend (Python/FastAPI)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run Celery worker (separate terminal)
celery -A app.worker.celery_app worker --loglevel=info

# Run tests
pytest tests/ -v
# Run single test
pytest tests/test_filename.py::test_function_name -v

# Lint (if configured)
ruff check .
# Format code
ruff format .
```

### Web Portal (Next.js/React)
```bash
cd web-portal

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
# Run single test
npm test -- --testPathPattern="filename" --watchAll=false

# Lint
npm run lint

# Typecheck
npm run typecheck
```

### Electron Client
```bash
cd electron-client

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for Windows
npm run build

# Package as executable
npm run package

# Run tests
npm test
```

### Docker (Full Stack)
```bash
# Start all services (PostgreSQL, Redis, Backend, Web)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 2. Code Style Guidelines

### General Principles
- Write self-documenting code; avoid unnecessary comments
- Follow DRY (Don't Repeat Yourself) principle
- Keep functions small and focused (single responsibility)
- Use meaningful variable/function names (no abbreviations except standard ones)
- Handle errors gracefully with appropriate error messages

### Python (Backend)

**Imports:**
```python
# Standard library imports first
import os
import sys
from typing import Optional, List, Dict, Any

# Third-party imports
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
import redis

# Local application imports
from app.models.user import User
from app.services.llm_service import LLMService
```

**Naming Conventions:**
- Classes: `PascalCase` (e.g., `CandidateRanker`)
- Functions/variables: `snake_case` (e.g., `rank_candidates`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`)
- Private methods: prefix with `_` (e.g., `_internal_method`)
- Type hints required for all function parameters and return values

**Formatting:**
- Line length: 100 characters max
- Indentation: 4 spaces
- Use `async/await` for I/O-bound operations
- Use type hints consistently

**Error Handling:**
```python
# Preferred pattern
try:
    result = await process_cv(cv_data)
except ValidationError as e:
    raise HTTPException(status_code=400, detail=str(e))
except ExternalServiceError as e:
    logger.error(f"LLM service failed: {e}")
    raise HTTPException(status_code=503, detail="Service temporarily unavailable")
```

### JavaScript/TypeScript (Frontend & Electron)

**Imports:**
```javascript
// React
import { useState, useEffect } from 'react';
import { Button, Modal } from '@/components/ui';

// Next.js
import { useRouter } from 'next/router';

// Electron IPC
import { ipcRenderer } from '@/shared/ipc-channels';

// Local modules
import { formatCandidateScore } from '@/utils/formatting';
```

**Naming Conventions:**
- Components: `PascalCase` (e.g., `CandidateCard`)
- Functions/variables: `camelCase` (e.g., `fetchCandidates`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- CSS classes: `kebab-case` (e.g., `candidate-card`)
- Files: `kebab-case` for utilities, `PascalCase` for components

**Formatting:**
- Use ESLint + Prettier (see config files)
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Use optional chaining (`?.`) and nullish coalescing (`??`)

**Types:**
```typescript
// Use interfaces for object shapes
interface Candidate {
  id: string;
  name: string;
  wowScore: number;
  status: CandidateStatus;
}

// Use type for unions/intersections
type CandidateStatus = 'pending' | 'invited' | 'testing' | 'passed' | 'failed';

// React prop types
interface ComponentProps {
  title: string;
  onSubmit: (data: FormData) => void;
  disabled?: boolean;
}
```

**Error Handling:**
```javascript
// Async error handling
try {
  const response = await fetch('/api/candidates');
  if (!response.ok) throw new Error('Failed to fetch');
  return await response.json();
} catch (error) {
  console.error('Fetch error:', error);
  setError('Failed to load candidates');
}

// Promise error handling
fetchData()
  .then(handleSuccess)
  .catch(handleError);
```

### React Components

```jsx
// Functional components with hooks
const CandidateCard = ({ candidate, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    // Side effects here
    return () => {
      // Cleanup
    };
  }, [candidate.id]);
  
  return (
    <div className="candidate-card">
      <h3>{candidate.name}</h3>
      <span>Score: {candidate.wowScore}</span>
      <Button onClick={() => onSelect(candidate.id)}>
        View Details
      </Button>
    </div>
  );
};
```

### File Organization

```
backend/
├── app/
│   ├── api/          # Route handlers (RESTful endpoints)
│   ├── core/         # Config, security, database connection
│   ├── models/       # SQLAlchemy/Pydantic models
│   ├── services/     # Business logic (LLM, ranking)
│   ├── schemas/      # Request/response schemas
│   └── worker/       # Celery tasks
├── tests/
│   ├── unit/
│   └── integration/
└── main.py

web-portal/
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Next.js pages (hr/, candidate/)
│   ├── services/     # API clients
│   ├── hooks/        # Custom React hooks
│   └── utils/        # Helper functions
└── package.json

electron-client/
├── src/
│   ├── main/         # Main process (Node.js)
│   │   └── security/ # OS-level security (hooking, kiosk)
│   ├── renderer/     # Renderer process (React UI)
│   │   ├── components/
│   │   └── ai_models/ # MediaPipe, speech recognition
│   └── shared/       # IPC channel definitions
└── package.json
```

---

## 3. Database Conventions

### PostgreSQL (via SQLAlchemy)
```python
class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    wow_score = Column(Float, default=0.0)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Redis (Queue Management)
```
Key patterns:
- queue:testing:{test_id}     # Test queue entry
- candidate:{id}:status       # Candidate status
- session:{id}:warnings       # Proctoring warnings
```

---

## 4. API Design

### RESTful Endpoints
```
POST   /api/candidates          # Create/upload candidate
GET    /api/candidates          # List candidates (with filters)
GET    /api/candidates/{id}     # Get candidate details
PUT    /api/candidates/{id}     # Update candidate
DELETE /api/candidates/{id}     # Remove candidate

POST   /api/tests/generate      # Generate test questions
GET    /api/tests/{id}          # Get test for candidate
POST   /api/tests/{id}/submit   # Submit test results

GET    /api/reports/hr          # HR dashboard data
```

---

## 5. Security Considerations

- Never commit `.env` files or credentials
- Use environment variables for all secrets
- JWT tokens for API authentication
- Validate all user inputs (Pydantic schemas, Zod)
- Sanitize data before database operations
- Rate limit API endpoints

---

## 6. Git Conventions

- Branch naming: `feature/`, `fix/`, `refactor/`
- Commits: Use conventional commits (`feat:`, `fix:`, `docs:`)
- PR description should explain "why" not "what"
