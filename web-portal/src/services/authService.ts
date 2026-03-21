import api from '@/lib/api'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from '@/types/auth'

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<{ data: AuthResponse }>('/auth/login', data)
    return response.data.data
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<{ data: AuthResponse }>('/auth/register', data)
    return response.data.data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async getMe(): Promise<UserResponse> {
    const response = await api.get<{ data: UserResponse }>('/auth/me')
    return response.data.data
  },
}
