import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { JobsPage } from '@/pages/JobsPage'
import { JobDetailPage } from '@/pages/JobDetailPage'
import { CompaniesPage } from '@/pages/CompaniesPage'
import { CompanyDetailPage } from '@/pages/CompanyDetailPage'
import { LandingPage } from '@/pages/LandingPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      } />
      <Route path="/register" element={
        <AuthLayout>
          <RegisterPage />
        </AuthLayout>
      } />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/jobs" element={
        <ProtectedRoute>
          <JobsPage />
        </ProtectedRoute>
      } />
      <Route path="/jobs/:id" element={
        <ProtectedRoute>
          <JobDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/companies" element={
        <ProtectedRoute>
          <CompaniesPage />
        </ProtectedRoute>
      } />
      <Route path="/companies/:id" element={
        <ProtectedRoute>
          <CompanyDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            },
            success: {
              iconTheme: {
                primary: 'hsl(var(--success))',
                secondary: 'white',
              },
            },
            error: {
              iconTheme: {
                primary: 'hsl(var(--destructive))',
                secondary: 'white',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
