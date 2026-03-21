# Recruitment Flow (LinkedIn-style + AI Screening + Anti-Cheat)

## Overview

This system simulates a LinkedIn-style recruitment platform with AI-powered CV screening and anti-cheat coding interviews.

Actors:
- Candidate
- HR (Recruiter)
- Backend API (Node.js)
- AI Service (CV scoring, proctoring)
- LLM Service (CV evaluation, test generation)
- Electron App (secure test environment)

---

## 1. User Registration & Role Selection

### Flow:
1. User registers account
2. User selects role:
   - candidate
   - hr

### Candidate Additional Requirements:
- GitHub repository link (required)
- Face image (for identity verification)
- CV/Resume file (PDF/DOCX)

### Data Model (Candidate):
{
  user_id,
  role: "candidate",
  github_url,
  face_image_url,
  cv_url,
  parsed_cv_data,
  status
}

---

## 2. Job Posting (HR)

### Flow:
1. HR creates job posting
2. Job contains:
   - title
   - description
   - required skills
   - experience level

### Data Model (Job):
{
  job_id,
  hr_id,
  title,
  description,
  required_skills,
  created_at
}

---

## 3. Job Discovery & Apply (Candidate)

### Flow:
1. Candidate browses job list
2. Candidate selects a job
3. Candidate clicks "Apply"

### On Apply:
Frontend sends:
{
  user_id,
  job_id
}

to Backend API

---

## 4. CV Screening (AI + LLM)

### Flow:
1. Backend receives apply request
2. Backend sends request to:
   - AI Service
   - LLM Service

### Input:
{
  user_id,
  job_id,
  cv_data,
  github_url
}

### LLM Tasks:
- Analyze CV
- Match skills with job requirements
- Evaluate experience
- Determine pass/fail

### Output:
{
  pass: boolean,
  score: number,
  feedback: string
}

---

## 5. Test Invitation (Immediate After Pass)

### Decision:
- If fail → return rejection to client
- If pass → generate test session

---

### Flow (Pass Case):

1. Backend generates:
   - CandidateID
   - TestID

2. System sends announcement to candidate:

Includes:
- ✅ Passed CV screening notification
- 🆔 CandidateID
- 🧪 TestID
- 📥 Electron App download/launch link
- 🎥 Requirement:
  - Webcam required
  - Microphone required

---

### Candidate Action:

1. Candidate prepares environment:
   - Ensure camera works
   - Ensure microphone works

2. Candidate downloads or launches Electron App

3. Candidate enters:
   - CandidateID
   - TestID

---

### Data Model (Test Session):

{
  candidate_id,
  test_id,
  job_id,
  status: "ready" | "testing" | "completed"
}

---

## 6. Coding Interview (Electron App + Anti-Cheat)

### Flow:
1. Candidate opens Electron App
2. Inputs CandidateID + TestID
3. App verifies session with backend
4. Starts test

---

### Electron App Behavior:

- Locks screen (kiosk mode)
- Activates anti-cheat system
- Starts proctoring
- Streams monitoring data to backend

---

### 6.1 Identity Verification

- Capture live face
- Compare with stored face image

Input:
- Stored face image
- Live webcam feed

Output:
- match_score
- verified: boolean

If not verified → block test

---

### 6.2 Proctoring (Real-time)

#### Vision:
- Detect gaze direction (MediaPipe Face Mesh)
- Detect abnormal head movement

#### Audio:
- Detect human speech
- Detect suspicious noise

#### Behavior:
- Track violations
- Increase warning level

If threshold exceeded:
→ Suspend test

---

### 6.3 Test Generation (LLM)

Input:
- Candidate CV
- Job requirements

LLM generates:
- 1–2 coding questions
- 2–3 system/design/project questions

---

### 6.4 Answer Submission

Candidate submits:
{
  answers,
  code,
  timestamps,
  proctoring_logs
}

---

## 7. Auto Grading (AI + LLM)

### Flow:
1. Backend receives submission

#### Coding:
- Run test cases
- Evaluate correctness

#### Theory / Project:
- Use LLM for semantic evaluation
- Compare with CV claims

#### Anti-Cheat:
- Analyze proctoring logs
- Detect anomalies

---

### Output:
{
  score,
  cheating_flag,
  evaluation_summary
}

---

## 8. HR Dashboard

### HR can view:
- Candidate list per job
- CV score
- Test score
- Cheating status
- Proctoring logs

### Data Model (Result):
{
  candidate_id,
  job_id,
  cv_score,
  test_score,
  cheating_flag,
  final_status
}

---

## 9. Final Decision

System or HR decides:
- PASS → Move to next round / offer
- FAIL → Reject

---

## System Rules

- All AI/LLM calls must go through service layer
- No direct client → AI calls
- All decisions must be logged
- Proctoring must run on client (Electron)
- Test session must be validated using CandidateID + TestID

---

## Key Constraints

- Must support multiple jobs and companies
- Must support concurrent candidates
- Must ensure anti-cheat integrity
- Must validate all AI outputs before use

---

## Event Flow Summary

Candidate Apply →
CV Screening →
Pass →
Generate TestID + CandidateID →
Send Announcement →
Candidate Launch Electron App →
Test →
Auto Grading →
HR Dashboard →
Final Decision