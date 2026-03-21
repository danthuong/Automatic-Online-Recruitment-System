import type {
  ApplicationStatus,
} from '@/types/index'

export interface PipelineStage {
  status: ApplicationStatus
  label: string
  count: number
}

export interface JobMetrics {
  id: string
  title: string
  companyName: string
  applicationCount: number
  status: string
  createdAt: string
}

export interface DashboardSummary {
  totalApplications: number
  activeJobs: number
  scheduledTests: number
  completedTests: number
}

export interface CreateJobPayload {
  companyId?: string
  title: string
  description: string
  summary?: string
  requiredSkills: string[]
  preferredSkills?: string[]
  experienceLevel?: string
  jobType?: string
  salary?: {
    min?: number
    max?: number
    currency?: string
    isNegotiable?: boolean
  }
  location?: string
  remote?: boolean
  hiringCount?: number
  expiresAt?: string
  testConfig?: {
    totalTime: number
    codeQuestionCount?: number
    essayQuestionCount?: number
    mcqQuestionCount?: number
    passingScore?: number
  }
}

export interface UpdateJobPayload extends Partial<CreateJobPayload> {
  status?: string
}

export interface ScreeningPayload {
  decision: 'pass' | 'fail'
  cvScore?: number
  screeningFeedback?: string
  hrNotes?: string
}

export interface ApplicationFilters {
  page?: number
  limit?: number
  status?: string
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
