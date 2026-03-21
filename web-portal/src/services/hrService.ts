import api from '@/lib/api'
import type {
  JobResponse,
  PaginatedResponse,
  ApplicationResponse,
} from '@/types/job'
import type {
  ApplicationFilters,
  CreateJobPayload,
  UpdateJobPayload,
  DashboardSummary,
  PipelineStage,
  JobMetrics,
  JobFilters,
} from '@/types/hr'
import { ApplicationStatus } from '@/types/index'

export const jobService = {
  async getAll(filters: JobFilters = {}): Promise<PaginatedResponse<JobResponse>> {
    const params = new URLSearchParams()
    if (filters.page) params.set('page', String(filters.page))
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.status) params.set('status', filters.status)
    if (filters.search) params.set('search', filters.search)
    if (filters.location) params.set('location', filters.location)
    if (filters.experienceLevel) params.set('experienceLevel', filters.experienceLevel)
    if (filters.requiredSkills) params.set('requiredSkills', filters.requiredSkills)
    if (filters.remote !== undefined) params.set('remote', String(filters.remote))

    const response = await api.get<PaginatedResponse<JobResponse>>(`/jobs?${params.toString()}`)
    return response.data
  },

  async getById(id: string): Promise<JobResponse> {
    const response = await api.get<{ data: JobResponse }>(`/jobs/${id}`)
    return response.data.data
  },

  async getByCompany(companyId: string, filters: JobFilters = {}): Promise<PaginatedResponse<JobResponse>> {
    const params = new URLSearchParams()
    if (filters.page) params.set('page', String(filters.page))
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.status) params.set('status', filters.status)

    const response = await api.get<PaginatedResponse<JobResponse>>(
      `/jobs/company/${companyId}?${params.toString()}`
    )
    return response.data
  },

  async getMyJobs(filters: JobFilters = {}): Promise<PaginatedResponse<JobResponse>> {
    const params = new URLSearchParams()
    if (filters.page) params.set('page', String(filters.page))
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.status) params.set('status', filters.status)
    if (filters.search) params.set('search', filters.search)

    const response = await api.get<PaginatedResponse<JobResponse>>(`/jobs/my-jobs?${params.toString()}`)
    return response.data
  },

  async create(data: CreateJobPayload): Promise<JobResponse> {
    const response = await api.post<{ data: JobResponse }>('/jobs', data)
    return response.data.data
  },

  async update(id: string, data: UpdateJobPayload): Promise<JobResponse> {
    const response = await api.patch<{ data: JobResponse }>(`/jobs/${id}`, data)
    return response.data.data
  },

  async updateStatus(id: string, status: string): Promise<JobResponse> {
    const response = await api.patch<{ data: JobResponse }>(`/jobs/${id}/status`, { status })
    return response.data.data
  },
}

export const applicationService = {
  async apply(jobId: string): Promise<ApplicationResponse> {
    const response = await api.post<{ data: ApplicationResponse }>('/applications', { jobId })
    return response.data.data
  },

  async getMyApplications(filters: ApplicationFilters = {}): Promise<PaginatedResponse<ApplicationResponse>> {
    const params = new URLSearchParams()
    if (filters.page) params.set('page', String(filters.page))
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.status) params.set('status', filters.status)

    const response = await api.get<PaginatedResponse<ApplicationResponse>>(
      `/applications/my-applications?${params.toString()}`
    )
    return response.data
  },

  async getById(id: string): Promise<ApplicationResponse> {
    const response = await api.get<{ data: ApplicationResponse }>(`/applications/${id}`)
    return response.data.data
  },

  async getByJob(
    jobId: string,
    filters: ApplicationFilters = {}
  ): Promise<PaginatedResponse<ApplicationResponse>> {
    const params = new URLSearchParams()
    if (filters.page) params.set('page', String(filters.page))
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.status) params.set('status', filters.status)

    const response = await api.get<PaginatedResponse<ApplicationResponse>>(
      `/applications/job/${jobId}?${params.toString()}`
    )
    return response.data
  },

  async updateStatus(
    id: string,
    data: {
      status: string
      cvScore?: number
      screeningFeedback?: string
      hrNotes?: string
    }
  ): Promise<ApplicationResponse> {
    const response = await api.patch<{ data: ApplicationResponse }>(
      `/applications/${id}/status`,
      data
    )
    return response.data.data
  },

  async screen(
    id: string,
    data: {
      decision: 'pass' | 'fail'
      cvScore?: number
      screeningFeedback?: string
      hrNotes?: string
    }
  ): Promise<ApplicationResponse> {
    const response = await api.post<{ data: ApplicationResponse }>(
      `/applications/${id}/screen`,
      data
    )
    return response.data.data
  },
}

export const hrService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const [pendingApps, activeJobsResult] = await Promise.all([
      applicationService.getMyApplications({ limit: 1 }),
      jobService.getMyJobs({ status: 'active', limit: 1 }),
    ])

    return {
      totalApplications: pendingApps.pagination.total,
      activeJobs: activeJobsResult.pagination.total,
      scheduledTests: 0,
      completedTests: 0,
    }
  },

  async getPipelineByJob(jobId: string): Promise<PipelineStage[]> {
    const stages: { status: ApplicationStatus; label: string }[] = [
      { status: ApplicationStatus.PENDING, label: 'Applied' },
      { status: ApplicationStatus.SCREENING, label: 'Screening' },
      { status: ApplicationStatus.SCREENING_PASSED, label: 'Passed' },
      { status: ApplicationStatus.SCHEDULED, label: 'Scheduled' },
      { status: ApplicationStatus.TEST_COMPLETED, label: 'Test Done' },
      { status: ApplicationStatus.OFFERED, label: 'Offered' },
      { status: ApplicationStatus.REJECTED, label: 'Rejected' },
    ]

    const counts: PipelineStage[] = await Promise.all(
      stages.map(async (stage) => {
        const result = await applicationService.getByJob(jobId, { status: stage.status, limit: 1 })
        return { ...stage, count: result.pagination.total }
      })
    )

    return counts
  },

  async getJobMetrics(): Promise<JobMetrics[]> {
    const result = await jobService.getMyJobs({ limit: 10 })
    return result.data.map((job) => ({
      id: job.id,
      title: job.title,
      companyName: job.company?.name || '',
      applicationCount: job.applicationCount,
      status: job.status,
      createdAt: job.createdAt,
    }))
  },
}
