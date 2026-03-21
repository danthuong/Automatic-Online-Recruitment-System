import api from '@/lib/api'
import type { TestResponse } from '@/types/index'

export interface CreateTestPayload {
  applicationId: string
  candidateId: string
  jobId: string
  questionIds: string[]
  totalTime: number
  scheduledAt?: string
  language?: string
}

export interface SubmitTestPayload {
  answers: Array<{
    questionId: string
    answer: string
    language?: string
    flagged?: boolean
    timeSpent?: number
  }>
  proctoringLogs?: Array<{
    type: 'warning' | 'critical' | 'info'
    event: string
    details?: string
  }>
  focusLossCount?: number
}

export const testService = {
  async create(data: CreateTestPayload): Promise<TestResponse> {
    const response = await api.post<{ data: TestResponse }>('/tests', data)
    return response.data.data
  },

  async getById(id: string): Promise<TestResponse> {
    const response = await api.get<{ data: TestResponse }>(`/tests/${id}`)
    return response.data.data
  },

  async getByTestId(testId: string): Promise<{ test: TestResponse; questions: unknown[] }> {
    const response = await api.get<{ data: { test: TestResponse; questions: unknown[] } }>(
      `/tests/testId/${testId}`
    )
    return response.data.data
  },

  async getByApplication(applicationId: string): Promise<TestResponse | null> {
    const response = await api.get<{ data: TestResponse | null }>(
      `/tests/application/${applicationId}`
    )
    return response.data.data
  },

  async getMyTests(): Promise<TestResponse[]> {
    const response = await api.get<{ data: TestResponse[] }>('/tests/my-tests')
    return response.data.data
  },

  async start(testId: string): Promise<TestResponse> {
    const response = await api.post<{ data: TestResponse }>(`/tests/${testId}/start`)
    return response.data.data
  },

  async submit(testId: string, data: SubmitTestPayload): Promise<TestResponse> {
    const response = await api.post<{ data: TestResponse }>(`/tests/${testId}/submit`, data)
    return response.data.data
  },
}
