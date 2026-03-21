import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HrRoute } from '@/components/HrRoute'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { JobsPage } from '@/pages/JobsPage'
import { JobDetailPage } from '@/pages/JobDetailPage'
import { CompaniesPage } from '@/pages/CompaniesPage'
import { CompanyDetailPage } from '@/pages/CompanyDetailPage'
import { LandingPage } from '@/pages/LandingPage'
import { HrDashboardPage } from '@/pages/hr/HrDashboardPage'
import { HrJobsPage } from '@/pages/hr/HrJobsPage'
import { HrJobDetailPage } from '@/pages/hr/HrJobDetailPage'
import { HrJobFormPage } from '@/pages/hr/HrJobFormPage'
import { HrApplicationsPage } from '@/pages/hr/HrApplicationsPage'
import { HrApplicationDetailPage } from '@/pages/hr/HrApplicationDetailPage'

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

      {/* HR Routes */}
      <Route path="/hr" element={
        <HrRoute>
          <HrDashboardPage />
        </HrRoute>
      } />
      <Route path="/hr/jobs" element={
        <HrRoute>
          <HrJobsPage />
        </HrRoute>
      } />
      <Route path="/hr/jobs/new" element={
        <HrRoute>
          <HrJobFormPage />
        </HrRoute>
      } />
      <Route path="/hr/jobs/:id" element={
        <HrRoute>
          <HrJobDetailPage />
        </HrRoute>
      } />
      <Route path="/hr/jobs/:id/edit" element={
        <HrRoute>
          <HrJobFormPage />
        </HrRoute>
      } />
      <Route path="/hr/applications" element={
        <HrRoute>
          <HrApplicationsPage />
        </HrRoute>
      } />
      <Route path="/hr/applications/:id" element={
        <HrRoute>
          <HrApplicationDetailPage />
        </HrRoute>
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
