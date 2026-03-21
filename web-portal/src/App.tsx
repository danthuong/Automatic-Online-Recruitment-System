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
import { ApplicationsPage } from '@/pages/ApplicationsPage'
import { ApplicationDetailPage } from '@/pages/ApplicationDetailPage'
import { MyTestsPage } from '@/pages/MyTestsPage'
import { CandidateProfilePage } from '@/pages/CandidateProfilePage'
import { HrDashboard } from '@/pages/hr/HrDashboard'
import { HrJobsPage } from '@/pages/hr/HrJobsPage'
import { CreateJobPage } from '@/pages/hr/CreateJobPage'
import { HrJobDetailPage } from '@/pages/hr/HrJobDetailPage'
import { ApplicationReviewPage } from '@/pages/hr/ApplicationReviewPage'

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

      {/* Candidate Routes */}
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
      <Route path="/applications" element={
        <ProtectedRoute>
          <ApplicationsPage />
        </ProtectedRoute>
      } />
      <Route path="/applications/:id" element={
        <ProtectedRoute>
          <ApplicationDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/my-tests" element={
        <ProtectedRoute>
          <MyTestsPage />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <CandidateProfilePage />
        </ProtectedRoute>
      } />

      {/* HR Routes */}
      <Route path="/hr" element={
        <HrRoute>
          <HrDashboard />
        </HrRoute>
      } />
      <Route path="/hr/jobs" element={
        <HrRoute>
          <HrJobsPage />
        </HrRoute>
      } />
      <Route path="/hr/jobs/create" element={
        <HrRoute>
          <CreateJobPage />
        </HrRoute>
      } />
      <Route path="/hr/jobs/:id" element={
        <HrRoute>
          <HrJobDetailPage />
        </HrRoute>
      } />
      <Route path="/hr/jobs/:id/edit" element={
        <HrRoute>
          <CreateJobPage />
        </HrRoute>
      } />
      <Route path="/hr/applications/:id" element={
        <HrRoute>
          <ApplicationReviewPage />
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
