import api from '@/lib/api'
import type {
  CompanyResponse,
  CompanyFilters,
  PaginatedResponse,
} from '@/types/job'

export const companyService = {
  async getAll(filters: CompanyFilters = {}): Promise<PaginatedResponse<CompanyResponse>> {
    const params = new URLSearchParams()
    if (filters.page) params.set('page', String(filters.page))
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.search) params.set('search', filters.search)
    if (filters.industry) params.set('industry', filters.industry)
    if (filters.location) params.set('location', filters.location)

    const response = await api.get<PaginatedResponse<CompanyResponse>>(`/companies?${params.toString()}`)
    return response.data
  },

  async getById(id: string): Promise<CompanyResponse> {
    const response = await api.get<{ data: CompanyResponse }>(`/companies/${id}`)
    return response.data.data
  },
}
