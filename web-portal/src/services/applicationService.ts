import api from '@/lib/api'
import type { ApplicationResponse, PaginatedResponse } from '@/types/job'

export interface ApplicationFilters {
  page?: number
  limit?: number
  status?: string
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
