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

export interface CandidateInfo {
  id: string
  userId: string
  user?: {
    id: string
    email: string
    role: string
    firstName: string
    lastName: string
    isActive: boolean
    createdAt: Date
  }
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  resumeUrl?: string
  githubUrl?: string
  faceImageUrl?: string
  cvUrl?: string
  parsedCvData?: Record<string, unknown>
  skills: string[]
  experience: number
  education?: string
  linkedInUrl?: string
  portfolioUrl?: string
  wowScore?: number
  createdAt: string
}

export interface ApplicationResponse {
  id: string
  candidateId: string
  candidate?: CandidateInfo
  jobId: string
  job?: JobResponse
  status: ApplicationStatus
  cvScore?: number
  screeningFeedback?: string
  screeningDetails?: {
    skillMatchScore?: number
    experienceMatchScore?: number
    educationMatchScore?: number
    overallScore?: number
    skillGaps?: string[]
    strengths?: string[]
    matchedPreferredSkills?: string[]
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
