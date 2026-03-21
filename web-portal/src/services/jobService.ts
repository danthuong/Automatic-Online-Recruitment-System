import api from '@/lib/api'
import type {
  JobResponse,
  JobFilters,
  PaginatedResponse,
} from '@/types/job'

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
}
