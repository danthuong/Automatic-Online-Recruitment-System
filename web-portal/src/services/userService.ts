import api from '@/lib/api'
import type { CandidateInfo } from '@/types/job'

export interface UpdateProfilePayload {
  firstName?: string
  lastName?: string
  phone?: string
  education?: string
  linkedInUrl?: string
  portfolioUrl?: string
  skills?: string[]
  experience?: number
}

export const userService = {
  async getMyCandidateProfile(): Promise<CandidateInfo> {
    const response = await api.get<{ data: CandidateInfo }>('/users/me/candidate-profile')
    return response.data.data
  },

  async updateProfile(
    userId: string,
    data: UpdateProfilePayload
  ): Promise<CandidateInfo> {
    const response = await api.patch<{ data: CandidateInfo }>(`/users/${userId}`, data)
    return response.data.data
  },
}
