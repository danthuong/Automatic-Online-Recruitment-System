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

export interface UserResponse {
  id: string
  email: string
  role: UserRole
  firstName: string
  lastName: string
  isActive: boolean
  companyId?: string
  createdAt: string
  updatedAt?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: UserResponse
  tokens: AuthTokens
}

export type UserRole = 'admin' | 'hr' | 'candidate'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  role: UserRole
  githubUrl?: string
  cvFileId?: string
  faceImageFileId?: string
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface AuthState {
  user: UserResponse | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
