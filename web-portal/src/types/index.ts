export enum UserRole {
  ADMIN = 'admin',
  HR = 'hr',
  CANDIDATE = 'candidate',
}

export enum CandidateStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  INVITED = 'invited',
  TESTING = 'testing',
  PASSED = 'passed',
  FAILED = 'failed',
  SUSPENDED = 'suspended',
}

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

export enum ExperienceLevel {
  INTERN = 'intern',
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  MANAGER = 'manager',
}

export enum JobType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  SCREENING = 'screening',
  SCREENING_PASSED = 'screening_passed',
  SCREENING_FAILED = 'screening_failed',
  SCHEDULED = 'scheduled',
  TEST_COMPLETED = 'test_completed',
  OFFERED = 'offered',
  REJECTED = 'rejected',
}

export enum TestStatus {
  PENDING = 'pending',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  EXPIRED = 'expired',
}

export interface TestResponse {
  id: string
  testId: string
  applicationId: string
  candidateId: string
  jobId: string
  totalTime: number
  status: TestStatus
  scheduledAt?: string
  startedAt?: string
  submittedAt?: string
  language?: string
  focusLossCount?: number
  createdAt: string
}

export interface Salary {
  min?: number
  max?: number
  currency?: string
  isNegotiable?: boolean
}

export interface TestConfig {
  totalTime: number
  codeQuestionCount?: number
  essayQuestionCount?: number
  mcqQuestionCount?: number
  passingScore?: number
}
