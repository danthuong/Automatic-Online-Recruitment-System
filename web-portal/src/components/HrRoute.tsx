import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import type { ReactNode } from 'react'

export function HrRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'hr') {
    toast.error('Access denied. HR role required.')
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
