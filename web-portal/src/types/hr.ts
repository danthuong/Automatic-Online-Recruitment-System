export type JobStatus = 'draft' | 'active' | 'paused' | 'closed'
export type ExperienceLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager'
export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship'

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

export interface JobFormData {
  title: string
  description: string
  summary?: string
  requiredSkills: string[]
  preferredSkills: string[]
  experienceLevel?: ExperienceLevel
  jobType?: JobType
  salary?: Salary
  location?: string
  remote?: boolean
  hiringCount?: number
  status?: JobStatus
  expiresAt?: string
  testConfig?: TestConfig
}
