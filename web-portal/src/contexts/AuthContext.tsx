import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authService } from '@/services/authService'
import type { AuthState, LoginRequest, RegisterRequest, UserResponse } from '@/types/auth'

export interface AuthContextValue extends AuthState {
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function getStoredAuth(): Pick<AuthState, 'user' | 'accessToken' | 'refreshToken'> {
  try {
    const user = localStorage.getItem('user')
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    return {
      user: user ? JSON.parse(user) : null,
      accessToken,
      refreshToken,
    }
  } catch {
    return { user: null, accessToken: null, refreshToken: null }
  }
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate()
  const stored = getStoredAuth()

  const [user, setUser] = useState<UserResponse | null>(stored.user)
  const [accessToken, setAccessToken] = useState<string | null>(stored.accessToken)
  const [refreshToken, setRefreshToken] = useState<string | null>(stored.refreshToken)
  const [isLoading, setIsLoading] = useState(false)

  const isAuthenticated = useMemo(() => !!user && !!accessToken, [user, accessToken])

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken)
    } else {
      localStorage.removeItem('accessToken')
    }
  }, [accessToken])

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    } else {
      localStorage.removeItem('refreshToken')
    }
  }, [refreshToken])

  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true)
    try {
      const result = await authService.login(data)
      setUser(result.user)
      setAccessToken(result.tokens.accessToken)
      setRefreshToken(result.tokens.refreshToken)
      toast.success('Welcome back!')
      navigate(result.user.role === 'hr' ? '/hr' : '/')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please try again.'
      toast.error(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true)
    try {
      const result = await authService.register(data)
      setUser(result.user)
      setAccessToken(result.tokens.accessToken)
      setRefreshToken(result.tokens.refreshToken)
      toast.success('Account created successfully!')
      navigate(result.user.role === 'hr' ? '/hr' : '/')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed. Please try again.'
      toast.error(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await authService.logout()
    } catch {
      // ignore logout errors
    } finally {
      setUser(null)
      setAccessToken(null)
      setRefreshToken(null)
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      toast.success('Logged out successfully')
      navigate('/login')
      setIsLoading(false)
    }
  }, [navigate])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, accessToken, refreshToken, isAuthenticated, isLoading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
