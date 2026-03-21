# Backend API Documentation

**Automatic Online Recruitment System**  
**Version:** 1.1.0  
**Base URL:** `http://localhost:5000/api/v1`

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [Users](#users)
  - [Companies](#companies)
  - [Jobs](#jobs)
  - [Applications](#applications)
  - [Questions](#questions)
  - [Tests](#tests)
  - [Upload](#upload)
  - [Files](#files)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Setup & Running](#setup--running)

---

## Overview

### Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (access + refresh tokens)
- **Validation:** Zod schemas

### Project Structure

```
backend/src/
├── app.ts              # Express app entry point
├── server.ts          # Server startup
├── config/
│   └── database.ts    # MongoDB connection
├── controllers/       # HTTP request handlers
├── middleware/       # Auth, validation, error handling
├── models/           # Mongoose schemas
├── routes/           # Route definitions
├── services/         # Business logic
├── types/            # TypeScript type definitions
└── utils/            # Helpers (errors, ApiResponse)
```

---

## Authentication

All protected endpoints require a JWT access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Tokens

| Token | Expiry | Purpose |
|-------|--------|---------|
| `accessToken` | 15 minutes | API authentication |
| `refreshToken` | 7 days | Obtain new access token |

### Role-Based Access

| Role | Permissions |
|------|-------------|
| `admin` | Full access to all endpoints |
| `hr` | Manage own company's jobs, applications, tests |
| `candidate` | Apply to jobs, take tests, view own profile |

---

## API Endpoints

### Auth

#### `POST /auth/register`

Register a new user. If role is `candidate`, a Candidate profile is auto-created.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "candidate",
  "firstName": "John",
  "lastName": "Doe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Unique, valid email format |
| `password` | string | Yes | Min 8 chars, uppercase, lowercase, number |
| `role` | enum | No | `admin`, `hr`, `candidate` (default: `candidate`) |
| `firstName` | string | Yes | 1-50 characters |
| `lastName` | string | Yes | 1-50 characters |
| `githubUrl` | string | Candidate only | GitHub username or URL |
| `cvFileId` | string | Candidate only | Uploaded CV file ID |
| `faceImageFileId` | string | Candidate only | Face image file ID for identity verification |

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "role": "candidate",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "createdAt": "2026-03-21T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

---

#### `POST /auth/login`

Authenticate with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "..." },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

---

#### `POST /auth/refresh`

Get a new access token using a valid refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

---

#### `POST /auth/logout`

Invalidate the current session.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `GET /auth/me`

Get the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "user@example.com",
    "role": "candidate",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2026-03-21T00:00:00.000Z"
  }
}
```

---

### Users

#### `GET /users`

List all users (paginated). **Admin and HR only.**

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `role` | enum | - | Filter by role |
| `search` | string | - | Search by name or email |

**Response (200):**

```json
{
  "success": true,
  "data": [/* users array */],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

#### `GET /users/me`

Get the authenticated user's own profile. Alias for `GET /auth/me`.

**Headers:** `Authorization: Bearer <access_token>`

---

#### `GET /users/me/candidate-profile`

Get the authenticated user's candidate profile (if role is `candidate`).

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "userId": "...",
    "user": { /* nested user object */ },
    "phone": "+84...",
    "resumeUrl": "https://...",
    "githubUrl": "https://github.com/...",
    "faceImageUrl": "https://...",
    "cvUrl": "https://...",
    "parsedCvData": {
      "skills": ["JavaScript", "React"],
      "experience": [...],
      "education": [...]
    },
    "skills": ["JavaScript", "React"],
    "experience": 3,
    "education": "FPT University",
    "linkedInUrl": "https://linkedin.com/...",
    "portfolioUrl": "https://...",
    "wowScore": 85,
    "createdAt": "2026-03-21T00:00:00.000Z"
  }
}
```

---

#### `GET /users/:id`

Get a single user by ID. **Admin and HR only.**

**Headers:** `Authorization: Bearer <access_token>`

---

#### `GET /users/:id/candidate-profile`

Get a user's candidate profile. **Admin and HR only.**

**Headers:** `Authorization: Bearer <access_token>`

---

#### `PATCH /users/:id`

Update a user's profile. Users can update themselves; only admins can update other users.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+84...",
  "githubUrl": "https://github.com/janesmith",
  "skills": ["Python", "Django"],
  "experience": 5,
  "education": "MIT",
  "linkedInUrl": "https://linkedin.com/in/...",
  "portfolioUrl": "https://..."
}
```

---

#### `DELETE /users/:id`

Soft delete a user (sets `isActive: false`). **Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

---

### Companies

#### `POST /companies`

Create a new company. **HR and Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "name": "TechCorp Vietnam",
  "description": "Leading software development company",
  "website": "https://techcorp.vn",
  "industry": "Technology",
  "size": "201-500",
  "location": "Ho Chi Minh City, Vietnam"
}
```

---

#### `GET /companies`

List all companies (paginated, public).

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `industry` | string | Filter by industry |
| `location` | string | Filter by location |
| `isVerified` | boolean | Filter verified companies |
| `search` | string | Search by name or description |

---

#### `GET /companies/:id`

Get a single company by ID (public).

---

#### `PATCH /companies/:id`

Update company details. **HR and Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

---

#### `PATCH /companies/:id/verify`

Verify a company. **Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

---

### Jobs

#### `POST /jobs`

Create a new job posting. **HR and Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

> If `companyId` is not provided, it defaults to the HR user's associated company.

**Request Body:**

```json
{
  "companyId": "...",
  "title": "Senior Frontend Developer",
  "description": "We are looking for...",
  "summary": "Build modern web apps",
  "requiredSkills": ["React", "TypeScript", "JavaScript"],
  "preferredSkills": ["Next.js", "GraphQL"],
  "experienceLevel": "senior",
  "jobType": "full-time",
  "salary": {
    "min": 2000,
    "max": 4000,
    "currency": "USD",
    "isNegotiable": true
  },
  "location": "Ho Chi Minh City",
  "remote": true,
  "hiringCount": 2,
  "testConfig": {
    "totalTime": 90,
    "codeQuestionCount": 2,
    "essayQuestionCount": 2,
    "mcqQuestionCount": 3,
    "passingScore": 70
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `companyId` | string | No | Defaults to HR's company |
| `title` | string | Yes | Job title |
| `description` | string | Yes | Full job description |
| `requiredSkills` | string[] | No | Required skills |
| `experienceLevel` | enum | No | `intern`, `junior`, `mid`, `senior`, `lead`, `manager` |
| `jobType` | enum | No | `full-time`, `part-time`, `contract`, `internship` |
| `testConfig.totalTime` | number | No | Time limit in minutes (default: 60) |

**Response (201):** Returns the created job object with nested `company` details.

---

#### `GET /jobs`

List all jobs (paginated, public).

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `status` | enum | `draft`, `active`, `paused`, `closed` |
| `companyId` | string | Filter by company |
| `hrId` | string | Filter by posting HR |
| `search` | string | Full-text search |
| `requiredSkills` | string | Comma-separated skills |
| `experienceLevel` | enum | Experience level |
| `location` | string | Location search |
| `remote` | boolean | Remote work filter |

---

#### `GET /jobs/my-jobs`

List all jobs posted by the authenticated HR user. **HR and Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:** Same as `GET /jobs` plus `search`.

---

#### `GET /jobs/company/:companyId`

List all jobs for a specific company (paginated, public).

**Query Parameters:** Same as `GET /jobs`.

---

#### `GET /jobs/:id`

Get a single job with nested `company` details (public).

---

#### `PATCH /jobs/:id`

Update a job. Only the HR who created it or admins.

**Headers:** `Authorization: Bearer <access_token>`

> A job must have `title`, `description`, and at least one `requiredSkill` before it can be set to `active`.

---

#### `PATCH /jobs/:id/status`

Update job status. **HR and Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "status": "active"
}
```

Valid statuses: `draft`, `active`, `paused`, `closed`.

---

### Applications

#### `POST /applications`

Apply to a job. **Candidate only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "jobId": "..."
}
```

> Cannot apply to the same job twice. Job must be `active`.

**Response (201):** Returns the created application with nested `candidate` and `job` details.

---

#### `GET /applications/my-applications`

Get all applications for the authenticated candidate. **Candidate only.**

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page (max 100) |
| `status` | enum | Filter by application status |

**Response (200):** Returns paginated applications with nested `job` details.

---

#### `GET /applications/job/:jobId`

Get all applications for a specific job. **HR and Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:** `page`, `limit`, `status`

**Response (200):** Returns paginated applications with nested `candidate` details.

---

#### `GET /applications/:id`

Get a single application with nested `candidate` and `job` details.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "candidateId": "...",
    "candidate": {
      "id": "...",
      "userId": "...",
      "user": {
        "id": "...",
        "email": "...",
        "role": "candidate",
        "firstName": "John",
        "lastName": "Doe",
        "isActive": true,
        "createdAt": "..."
      },
      "phone": "+84...",
      "resumeUrl": "https://...",
      "githubUrl": "https://github.com/...",
      "faceImageUrl": "https://...",
      "cvUrl": "https://...",
      "parsedCvData": { "..." },
      "skills": ["React", "TypeScript"],
      "experience": 3,
      "education": "FPT University",
      "wowScore": 85
    },
    "jobId": "...",
    "job": { /* nested job with company */ },
    "status": "pending",
    "cvScore": 85,
    "screeningFeedback": "Strong candidate",
    "screeningDetails": {
      "skillMatchScore": 90,
      "experienceMatchScore": 80,
      "overallScore": 85,
      "skillGaps": ["Testing"],
      "strengths": ["React", "TypeScript"],
      "llmFeedback": "Excellent candidate",
      "githubAnalysis": {
        "repos": 15,
        "stars": 120,
        "mainLanguages": ["TypeScript", "Python"],
        "activity": "active"
      }
    },
    "hrNotes": "Good technical skills",
    "hrDecision": "pending",
    "appliedAt": "2026-03-21T00:00:00.000Z",
    "screenedAt": "2026-03-21T00:00:00.000Z",
    "createdAt": "2026-03-21T00:00:00.000Z"
  }
}
```

---

#### `PATCH /applications/:id/status`

Update application status. **HR and Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "status": "screening_passed",
  "cvScore": 85,
  "screeningFeedback": "Strong candidate",
  "screeningDetails": {
    "skillMatchScore": 90,
    "experienceMatchScore": 80,
    "overallScore": 85,
    "skillGaps": ["Testing"],
    "strengths": ["React", "TypeScript"],
    "llmFeedback": "Excellent candidate for frontend role"
  },
  "hrNotes": "Good technical skills"
}
```

**Status Flow:**

```
pending → screening → screening_passed / screening_failed
                     → scheduled → test_completed → offered / rejected
```

---

#### `POST /applications/:id/screen`

Submit a screening decision for an application. **HR and Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "decision": "pass",
  "cvScore": 85,
  "screeningFeedback": "Strong candidate with relevant skills",
  "hrNotes": "Proceed to interview scheduling"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `decision` | enum | Yes | `pass` or `fail` |
| `cvScore` | number | No | CV score 0-100 |
| `screeningFeedback` | string | No | Human-readable feedback |
| `hrNotes` | string | No | Internal HR notes |

> Sets status to `screening_passed` if `decision: "pass"`, or `screening_failed` if `decision: "fail"`. Also sets `screenedAt`.

---

### Questions

#### `POST /questions`

Create a single question. **Admin and HR only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "testId": "...",
  "type": "code",
  "difficulty": "easy",
  "title": "Two Sum",
  "content": "Given an array of integers...",
  "constraints": ["2 <= nums.length <= 10^4"],
  "examples": [
    {
      "input": "nums = [2,7,11,15], target = 9",
      "output": "[0,1]",
      "explanation": "nums[0] + nums[1] == 9"
    }
  ],
  "testCases": [
    { "input": "nums = [2,7], target = 9", "expected": "[0,1]", "visible": true }
  ],
  "starterCode": {
    "python": "def two_sum(nums, target):\n    pass",
    "javascript": "function twoSum(nums, target) {}"
  },
  "allowedLanguages": ["python", "javascript", "java"],
  "tags": ["arrays", "hash-table"],
  "source": "llm",
  "llmModel": "gpt-4o"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | enum | Yes | `code`, `mcq`, `essay`, `system-design` |
| `difficulty` | enum | Yes | `easy`, `medium`, `hard` |
| `title` | string | Yes | Question title |
| `content` | string | Yes | Question text |
| `options` | array | MCQ only | Array of `{ id, text }` |
| `correctAnswer` | string | MCQ only | Correct option ID |
| `starterCode` | object | Code only | Starter code by language |
| `testCases` | array | Code only | Test cases with expected output |

---

#### `POST /questions/bulk`

Create multiple questions at once.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "questions": [/* array of question objects */]
}
```

---

#### `GET /questions/by-ids`

Get questions by their IDs. Returns questions **with correct answers** for grading.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:** `ids` (comma-separated ObjectIds)

---

#### `GET /questions/by-tags`

Get questions filtered by tags. Returns questions **without correct answers**.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `tags` | string | Yes | Comma-separated tags |
| `type` | enum | No | Filter by type |
| `difficulty` | enum | No | Filter by difficulty |
| `limit` | number | No | Max results (default: 10) |

---

#### `GET /questions/test/:testId`

Get questions for a specific test. Returns questions **without correct answers**.

---

### Tests

#### `POST /tests`

Create a test for a candidate. **HR and Admin only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "applicationId": "...",
  "candidateId": "...",
  "jobId": "...",
  "questionIds": ["...", "...", "..."],
  "totalTime": 90,
  "scheduledAt": "2026-03-25T09:00:00.000Z",
  "language": "python"
}
```

> A test is automatically generated with status `ready` and a unique `testId` (format: `TEST-XXXXXXXX`).

**Response (201):**

```json
{
  "success": true,
  "message": "Test created successfully",
  "data": {
    "id": "...",
    "testId": "TEST-ABC12345",
    "applicationId": "...",
    "candidateId": "...",
    "jobId": "...",
    "totalTime": 90,
    "status": "ready",
    "scheduledAt": "2026-03-25T09:00:00.000Z",
    "language": "python",
    "createdAt": "2026-03-21T00:00:00.000Z"
  }
}
```

---

#### `GET /tests/:id`

Get a test by its MongoDB ObjectId.

**Headers:** `Authorization: Bearer <access_token>`

---

#### `GET /tests/testId/:testId`

Get a test with its questions by human-readable test ID. Used by Electron client at test start.  
Returns questions **without correct answers**.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "test": {
      "id": "...",
      "testId": "TEST-ABC12345",
      "applicationId": "...",
      "candidateId": "...",
      "jobId": "...",
      "totalTime": 90,
      "status": "ready",
      "scheduledAt": "...",
      "language": "python"
    },
    "questions": [
      {
        "id": "...",
        "type": "code",
        "difficulty": "easy",
        "title": "Two Sum",
        "content": "...",
        "starterCode": { "python": "...", "javascript": "..." },
        "allowedLanguages": ["python", "javascript"],
        "testCases": [...],
        "constraints": [...]
      }
    ]
  }
}
```

---

#### `GET /tests/my-tests`

Get all tests for the authenticated candidate. **Candidate only.**

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):** Returns array of test objects.

---

#### `GET /tests/application/:applicationId`

Get the test associated with a specific application.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):** Returns the test or `404` if no test exists for this application.

---

#### `POST /tests/:testId/start`

Candidate starts a test. **Candidate only.**

**Headers:** `Authorization: Bearer <access_token>`

> Verifies the test belongs to the candidate. Sets `status` to `in_progress` and `startedAt` to now.

---

#### `POST /tests/:testId/submit`

Submit test answers. **Candidate only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "answers": [
    {
      "questionId": "...",
      "answer": "def two_sum(nums, target):\n    ...",
      "language": "python",
      "flagged": false,
      "timeSpent": 600
    }
  ],
  "proctoringLogs": [
    {
      "type": "warning",
      "event": "focus_loss",
      "details": "Window lost focus for 3 seconds"
    }
  ],
  "focusLossCount": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `answers` | array | Yes | Array of answer objects |
| `answers[].questionId` | string | Yes | Question ObjectId |
| `answers[].answer` | string | Yes | Candidate's answer |
| `answers[].language` | string | No | Programming language |
| `answers[].flagged` | boolean | No | Marked for review |
| `answers[].timeSpent` | number | No | Seconds spent |
| `proctoringLogs` | array | No | Anti-cheat violation logs |
| `focusLossCount` | number | No | Number of focus loss events |

---

### Upload

#### `POST /upload/cv`

Upload a CV/resume file for a candidate. **Authenticated users only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request:** `multipart/form-data` with field `file`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | PDF, DOC, or DOCX (max 12MB) |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "filename": "resume.pdf",
    "contentType": "application/pdf",
    "size": 245000
  }
}
```

---

#### `POST /upload/face-image`

Upload a face photo for identity verification. **Authenticated users only.**

**Headers:** `Authorization: Bearer <access_token>`

**Request:** `multipart/form-data` with field `file`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | JPG, PNG, or WebP (max 12MB) |

**Response (201):** Same format as `POST /upload/cv`.

---

### Files

#### `GET /files/:id`

Serve a previously uploaded file by its ID. Returns the raw file.

**Headers:** `Authorization: Bearer <access_token>`

---

## Data Models

### User

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `email` | string | Unique email address |
| `password` | string | Hashed password (bcrypt) |
| `role` | enum | `admin`, `hr`, `candidate` |
| `firstName` | string | First name |
| `lastName` | string | Last name |
| `isActive` | boolean | Account active status |
| `companyId` | ObjectId | Reference to Company (for HR) |
| `refreshTokenHash` | string | Hashed refresh token |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

### Candidate

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `userId` | ObjectId | Reference to User |
| `phone` | string | Phone number |
| `resumeUrl` | string | Uploaded resume URL |
| `githubUrl` | string | GitHub profile URL |
| `faceImageUrl` | string | Face image for verification |
| `cvUrl` | string | CV file URL |
| `parsedCvData` | object | AI-parsed CV structured data |
| `skills` | string[] | Extracted skills |
| `experience` | number | Years of experience |
| `education` | string | Education background |
| `wowScore` | number | CV screening score (0-100) |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

### Company

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `name` | string | Unique company name |
| `description` | string | About the company |
| `website` | string | Company website URL |
| `logoUrl` | string | Company logo URL |
| `industry` | string | Industry category |
| `size` | string | Company size (e.g., "201-500") |
| `location` | string | Headquarters location |
| `foundedYear` | number | Year founded |
| `isVerified` | boolean | Verification status |
| `createdBy` | ObjectId | Creator user ID |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

### Job

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `hrId` | ObjectId | Creator HR user ID |
| `companyId` | ObjectId | Reference to Company |
| `title` | string | Job title |
| `description` | string | Full job description |
| `summary` | string | Short summary for job cards |
| `requiredSkills` | string[] | Required skills |
| `preferredSkills` | string[] | Nice-to-have skills |
| `experienceLevel` | enum | `intern`, `junior`, `mid`, `senior`, `lead`, `manager` |
| `jobType` | enum | `full-time`, `part-time`, `contract`, `internship` |
| `salary` | object | `{ min, max, currency, isNegotiable }` |
| `location` | string | Job location |
| `remote` | boolean | Remote work allowed |
| `hiringCount` | number | Number of open positions |
| `applicationCount` | number | Denormalized application count |
| `status` | enum | `draft`, `active`, `paused`, `closed` |
| `expiresAt` | Date | Job expiration date |
| `testConfig` | object | `{ totalTime, codeQuestionCount, essayQuestionCount, mcqQuestionCount, passingScore }` |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

### Application

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `candidateId` | ObjectId | Reference to User (candidate) |
| `jobId` | ObjectId | Reference to Job |
| `status` | enum | Application status |
| `cvScore` | number | AI screening score (0-100) |
| `screeningFeedback` | string | Human-readable feedback |
| `screeningDetails` | object | LLM analysis results |
| `appliedAt` | Date | Application timestamp |
| `screenedAt` | Date | Screening completion timestamp |
| `hrNotes` | string | HR manual notes |
| `hrDecision` | enum | `pending`, `approved`, `rejected` |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

**Application Status Flow:**

```
pending → screening → screening_passed / screening_failed
                     → scheduled → test_completed → offered / rejected
```

### Question

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `testId` | ObjectId | Reference to Test |
| `type` | enum | `code`, `mcq`, `essay`, `system-design` |
| `difficulty` | enum | `easy`, `medium`, `hard` |
| `title` | string | Question title |
| `content` | string | Question text |
| `constraints` | string[] | Constraints |
| `examples` | array | Input/output examples |
| `testCases` | array | Test cases |
| `options` | array | MCQ options `{ id, text }` |
| `correctAnswer` | string | MCQ correct answer ID |
| `starterCode` | object | Starter code by language |
| `allowedLanguages` | string[] | Allowed coding languages |
| `minWords` | number | Essay min word count |
| `maxWords` | number | Essay max word count |
| `rubric` | object | Grading rubric |
| `tags` | string[] | Skill/topic tags |
| `source` | string | `llm` or `manual` |
| `llmModel` | string | LLM model used |
| `usageCount` | number | Times used in tests |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

### Test

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `testId` | string | Human-readable ID (e.g., `TEST-ABC12345`) |
| `applicationId` | ObjectId | Reference to Application |
| `candidateId` | ObjectId | Reference to User (candidate) |
| `jobId` | ObjectId | Reference to Job |
| `questionIds` | ObjectId[] | References to Questions |
| `totalTime` | number | Time limit in minutes |
| `status` | enum | `pending`, `ready`, `in_progress`, `submitted`, `graded`, `expired` |
| `scheduledAt` | Date | Scheduled start time |
| `startedAt` | Date | Actual start time |
| `submittedAt` | Date | Submission time |
| `answers` | array | Candidate's answers `{ questionId, answer, language, flagged, timeSpent }` |
| `language` | string | Preferred programming language |
| `proctoringLogs` | array | Violation logs `{ timestamp, type, event, details }` |
| `focusLossCount` | number | Focus loss events |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

---

## Error Handling

All errors return a consistent format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Error Fields

| HTTP Code | Error Type | Description |
|-----------|------------|-------------|
| 400 | ValidationError | Invalid request body or parameters |
| 401 | UnauthorizedError | Missing or invalid token |
| 403 | ForbiddenError | Insufficient permissions |
| 404 | NotFoundError | Resource not found |
| 409 | ConflictError | Duplicate resource (e.g., already applied) |
| 500 | AppError | Internal server error |

---

## Setup & Running

### Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- npm or yarn

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/lotus_hack
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
BCRYPT_SALT_ROUNDS=12
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Seed database with test data
npm run seed

# Type check
npm run typecheck

# Lint
npm run lint
```

### Seeding Test Data

Run `npm run seed` to populate the database with:

- 1 Admin, 2 HR users, 5 Candidates
- 3 Companies
- 4 Jobs (mix of active/draft)
- 4 Applications (various statuses)
- 6 Questions (code, essay, MCQ types)
- 2 Tests (one submitted, one ready)

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@lotushack.com` | `Admin123!` |
| HR | `hr@lotushack.com` | `Hr123456!` |
| HR | `hr2@dataflow.ai` | `Hr123456!` |
| Candidate | `candidate1@test.com` - `candidate5@test.com` | `Candidate123!` |
