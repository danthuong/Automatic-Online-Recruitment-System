import api from '@/lib/api'
import type { JobResponse, PaginatedResponse } from '@/types/job'
import type {
  JobFilters,
  DashboardSummary,
  JobMetrics,
} from '@/types/hr'

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

  async create(data: Record<string, unknown>): Promise<JobResponse> {
    const response = await api.post<{ data: JobResponse }>('/jobs', data)
    return response.data.data
  },

  async update(id: string, data: Record<string, unknown>): Promise<JobResponse> {
    const response = await api.patch<{ data: JobResponse }>(`/jobs/${id}`, data)
    return response.data.data
  },

  async updateStatus(id: string, status: string): Promise<JobResponse> {
    const response = await api.patch<{ data: JobResponse }>(`/jobs/${id}/status`, { status })
    return response.data.data
  },
}

export const hrService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const [pendingApps, activeJobsResult] = await Promise.all([
      api.get<{ pagination: { total: number } }>('/applications/my-applications?limit=1').then((r) => r.data),
      jobService.getMyJobs({ status: 'active', limit: 1 }),
    ])

    return {
      totalApplications: pendingApps.pagination.total,
      activeJobs: activeJobsResult.pagination.total,
      scheduledTests: 0,
      completedTests: 0,
    }
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
