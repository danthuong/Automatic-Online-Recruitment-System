import type {
  ExperienceLevel,
  JobStatus,
  JobType,
  Salary,
  TestConfig,
} from '@/types/auth'

export interface JobResponse {
  id: string
  hrId: string
  companyId: string
  company?: CompanyResponse
  title: string
  description: string
  summary?: string
  requiredSkills: string[]
  preferredSkills?: string[]
  experienceLevel?: ExperienceLevel
  jobType?: JobType
  salary?: Salary
  location?: string
  remote?: boolean
  hiringCount: number
  applicationCount: number
  status: JobStatus
  expiresAt?: string
  testConfig?: TestConfig
  createdAt: string
}

export interface CompanyResponse {
  id: string
  name: string
  description?: string
  website?: string
  logoUrl?: string
  industry?: string
  size?: string
  location?: string
  foundedYear?: number
  createdBy: string
  isVerified: boolean
  createdAt: string
}

export interface ApplicationResponse {
  id: string
  candidateId: string
  candidate?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
  jobId: string
  job?: JobResponse
  status: ApplicationStatus
  cvScore?: number
  screeningFeedback?: string
  screeningDetails?: {
    skillMatchScore?: number
    experienceMatchScore?: number
    overallScore?: number
    skillGaps?: string[]
    strengths?: string[]
    llmFeedback?: string
    githubAnalysis?: {
      repos?: number
      stars?: number
      mainLanguages?: string[]
      activity?: string
    }
  }
  hrNotes?: string
  hrDecision?: string
  appliedAt: string
  screenedAt?: string
  createdAt: string
}

export type ApplicationStatus =
  | 'pending'
  | 'screening'
  | 'screening_passed'
  | 'screening_failed'
  | 'scheduled'
  | 'test_completed'
  | 'offered'
  | 'rejected'

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  total?: number
}

export interface JobFilters {
  page?: number
  limit?: number
  status?: string
  search?: string
  location?: string
  experienceLevel?: string
  requiredSkills?: string
  remote?: boolean
}

export interface CompanyFilters {
  page?: number
  limit?: number
  search?: string
  industry?: string
  location?: string
}
