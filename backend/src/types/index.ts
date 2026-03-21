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

export enum QuestionType {
  CODE = 'code',
  MCQ = 'mcq',
  ESSAY = 'essay',
  SYSTEM_DESIGN = 'system-design',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum TestStatus {
  PENDING = 'pending',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  EXPIRED = 'expired',
}

export interface IUser {
  _id: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
  refreshTokenHash?: string;
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
  companyId?: string;
  createdAt: Date;
}

export interface ParsedCvData {
  rawText?: string;
  name?: string;
  phone?: string;
  skills?: string[];
  experience?: Array<{
    company?: string;
    title?: string;
    startDate?: Date;
    endDate?: Date;
    description?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    field?: string;
    graduationYear?: number;
  }>;
  certifications?: string[];
  languages?: string[];
}

export interface ICandidate {
  _id: string;
  userId: string;
  phone?: string;
  resumeUrl?: string;
  githubUrl?: string;
  faceImageUrl?: string;
  cvUrl?: string;
  parsedCvData?: ParsedCvData;
  skills: string[];
  experience: number;
  education?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  wowScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateResponse {
  id: string;
  userId: string;
  user?: UserResponse;
  phone?: string;
  resumeUrl?: string;
  githubUrl?: string;
  faceImageUrl?: string;
  cvUrl?: string;
  parsedCvData?: ParsedCvData;
  skills: string[];
  experience: number;
  education?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  wowScore?: number;
  createdAt: Date;
}

export interface ICompany {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  industry?: string;
  size?: string;
  location?: string;
  foundedYear?: number;
  createdBy: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyResponse {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  industry?: string;
  size?: string;
  location?: string;
  foundedYear?: number;
  createdBy: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface Salary {
  min?: number;
  max?: number;
  currency?: string;
  isNegotiable?: boolean;
}

export interface TestConfig {
  totalTime: number;
  codeQuestionCount: number;
  essayQuestionCount: number;
  mcqQuestionCount: number;
  passingScore: number;
}

export interface IJob {
  _id: string;
  hrId: string;
  companyId: string;
  title: string;
  description: string;
  summary?: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  experienceLevel: ExperienceLevel;
  jobType: JobType;
  salary?: Salary;
  location?: string;
  remote?: boolean;
  hiringCount: number;
  applicationCount: number;
  status: JobStatus;
  expiresAt?: Date;
  testConfig: TestConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobResponse {
  id: string;
  hrId: string;
  companyId: string;
  company?: CompanyResponse;
  title: string;
  description: string;
  summary?: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  experienceLevel: ExperienceLevel;
  jobType: JobType;
  salary?: Salary;
  location?: string;
  remote?: boolean;
  hiringCount: number;
  applicationCount: number;
  status: JobStatus;
  expiresAt?: Date;
  testConfig: TestConfig;
  createdAt: Date;
}

export interface ScreeningDetails {
  skillMatchScore?: number;
  experienceMatchScore?: number;
  overallScore?: number;
  skillGaps?: string[];
  strengths?: string[];
  llmFeedback?: string;
  githubAnalysis?: {
    repos?: number;
    stars?: number;
    mainLanguages?: string[];
    activity?: string;
  };
}

export interface IApplication {
  _id: string;
  candidateId: string;
  jobId: string;
  status: ApplicationStatus;
  cvScore?: number;
  screeningFeedback?: string;
  screeningDetails?: ScreeningDetails;
  appliedAt: Date;
  screenedAt?: Date;
  hrNotes?: string;
  hrDecision?: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationResponse {
  id: string;
  candidateId: string;
  candidate?: CandidateResponse;
  jobId: string;
  job?: JobResponse;
  status: ApplicationStatus;
  cvScore?: number;
  screeningFeedback?: string;
  screeningDetails?: ScreeningDetails;
  appliedAt: Date;
  screenedAt?: Date;
  hrNotes?: string;
  hrDecision?: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface TestCase {
  input: string;
  expected: string;
  visible: boolean;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface IQuestion {
  _id: string;
  testId?: string;
  type: QuestionType;
  difficulty: Difficulty;
  title: string;
  content: string;
  constraints?: string[];
  examples?: Example[];
  testCases?: TestCase[];
  options?: QuestionOption[];
  correctAnswer?: string;
  starterCode?: Record<string, string>;
  allowedLanguages?: string[];
  minWords?: number;
  maxWords?: number;
  rubric?: Record<string, unknown>;
  tags?: string[];
  source: string;
  llmModel?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionResponse {
  id: string;
  testId?: string;
  type: QuestionType;
  difficulty: Difficulty;
  title: string;
  content: string;
  constraints?: string[];
  examples?: Example[];
  testCases?: TestCase[];
  options?: QuestionOption[];
  minWords?: number;
  maxWords?: number;
  allowedLanguages?: string[];
  starterCode?: Record<string, string>;
  tags?: string[];
  source: string;
  createdAt: Date;
}

export interface ProctoringLog {
  timestamp: Date;
  type: 'warning' | 'critical' | 'info';
  event: string;
  details?: string;
}

export interface TestAnswer {
  questionId: string;
  answer: string;
  language?: string;
  flagged?: boolean;
  timeSpent?: number;
}

export interface ITest {
  _id: string;
  testId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  questionIds: string[];
  totalTime: number;
  status: TestStatus;
  scheduledAt?: Date;
  startedAt?: Date;
  submittedAt?: Date;
  answers?: TestAnswer[];
  language?: string;
  proctoringLogs?: ProctoringLog[];
  focusLossCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestResponse {
  id: string;
  testId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  totalTime: number;
  status: TestStatus;
  scheduledAt?: Date;
  startedAt?: Date;
  submittedAt?: Date;
  language?: string;
  focusLossCount?: number;
  createdAt: Date;
}
