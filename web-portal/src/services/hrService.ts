import api from '@/lib/api'
import type {
  PaginatedResponse,
  JobResponse,
  ApplicationResponse,
  CompanyResponse,
} from '@/types/job'

export interface CandidateProfile {
  id: string
  userId: string
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
    isActive: boolean
    createdAt: string
  }
  phone?: string
  resumeUrl?: string
  githubUrl?: string
  faceImageUrl?: string
  cvUrl?: string
  skills: string[]
  experience: number
  education?: string
  linkedInUrl?: string
  portfolioUrl?: string
  wowScore?: number
  createdAt: string
}

export interface ScreeningInput {
  decision: 'pass' | 'fail'
  cvScore?: number
  screeningFeedback?: string
  hrNotes?: string
}

export interface HrStats {
  activeJobs: number
  totalCandidates: number
  pendingReviews: number
  screeningPassRate: number
}

export const hrService = {
  async getMyJobs(params?: {
    page?: number
    limit?: number
    status?: string
    search?: string
  }): Promise<PaginatedResponse<JobResponse>> {
    const response = await api.get<{ data: PaginatedResponse<JobResponse> }>('/jobs/my-jobs', { params })
    return response.data.data
  },

  async getJob(id: string): Promise<JobResponse> {
    const response = await api.get<{ data: JobResponse }>(`/jobs/${id}`)
    return response.data.data
  },

  async createJob(data: Record<string, unknown>): Promise<JobResponse> {
    const response = await api.post<{ data: JobResponse }>('/jobs', data)
    return response.data.data
  },

  async updateJob(id: string, data: Record<string, unknown>): Promise<JobResponse> {
    const response = await api.patch<{ data: JobResponse }>(`/jobs/${id}`, data)
    return response.data.data
  },

  async updateJobStatus(id: string, status: string): Promise<JobResponse> {
    const response = await api.patch<{ data: JobResponse }>(`/jobs/${id}/status`, { status })
    return response.data.data
  },

  async getApplicationsByJob(
    jobId: string,
    params?: { page?: number; limit?: number; status?: string }
  ): Promise<PaginatedResponse<ApplicationResponse>> {
    const response = await api.get<{ data: PaginatedResponse<ApplicationResponse> }>(`/applications/job/${jobId}`, { params })
    return response.data.data
  },

  async getApplication(id: string): Promise<ApplicationResponse> {
    const response = await api.get<{ data: ApplicationResponse }>(`/applications/${id}`)
    return response.data.data
  },

  async getAllApplications(params?: {
    page?: number
    limit?: number
    status?: string
  }): Promise<PaginatedResponse<ApplicationResponse>> {
    const response = await api.get<{ data: PaginatedResponse<ApplicationResponse> }>('/applications', { params })
    return response.data.data
  },

  async updateApplicationStatus(
    id: string,
    data: { status: string; hrNotes?: string; cvScore?: number; screeningFeedback?: string }
  ): Promise<ApplicationResponse> {
    const response = await api.patch<{ data: ApplicationResponse }>(`/applications/${id}/status`, data)
    return response.data.data
  },

  async screenApplication(id: string, data: ScreeningInput): Promise<ApplicationResponse> {
    const response = await api.post<{ data: ApplicationResponse }>(`/applications/${id}/screen`, data)
    return response.data.data
  },

  async getCandidateProfile(userId: string): Promise<CandidateProfile> {
    const response = await api.get<{ data: CandidateProfile }>(`/users/${userId}/candidate-profile`)
    return response.data.data
  },

  async getCompany(id: string): Promise<CompanyResponse> {
    const response = await api.get<{ data: CompanyResponse }>(`/companies/${id}`)
    return response.data.data
  },
}
