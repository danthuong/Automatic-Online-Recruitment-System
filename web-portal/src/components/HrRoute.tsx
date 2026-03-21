import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { ReactNode } from 'react'

interface HrRouteProps {
  children: ReactNode
}

export function HrRoute({ children }: HrRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'hr' && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
