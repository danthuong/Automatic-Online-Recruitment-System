import api from '@/lib/api'
import type { ApplicationResponse, PaginatedResponse } from '@/types/job'

export const applicationService = {
  async apply(jobId: string): Promise<ApplicationResponse> {
    const response = await api.post<{ data: ApplicationResponse }>('/applications', { jobId })
    return response.data.data
  },

  async getMyApplications(filters: { page?: number; limit?: number; status?: string } = {}): Promise<PaginatedResponse<ApplicationResponse>> {
    const params = new URLSearchParams()
    if (filters.page) params.set('page', String(filters.page))
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.status) params.set('status', filters.status)

    const response = await api.get<PaginatedResponse<ApplicationResponse>>(
      `/applications/my-applications?${params.toString()}`
    )
    return response.data
  },
}
