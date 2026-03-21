import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowRight } from 'lucide-react'
import { HrLayout } from '@/components/hr/HrLayout'
import { HrStatCard } from '@/components/hr/HrStatCard'
import { JobStatusBadge } from '@/components/hr/JobStatusBadge'
import { ApplicationStatusBadge } from '@/components/hr/ApplicationStatusBadge'
import { hrService } from '@/services/hrService'
import type { JobResponse } from '@/types/job'
import type { ApplicationResponse } from '@/types/job'

export function HrDashboardPage() {
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          hrService.getMyJobs({ limit: 5 }),
          hrService.getAllApplications({ limit: 5 }),
        ])
        setJobs(jobsRes.data)
        setApplications(appsRes.data)
      } catch {
        // handle error
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // const activeJobs = jobs.filter(j => j.status === 'active').length
  const activeJobs = jobs ? jobs.length : 0
  const totalCandidates = applications ? applications.length : 0
  const pendingReviews = applications ? applications.filter(a => a.status === 'pending' || a.status === 'screening').length : 0
  const screened = applications ? applications.filter(a => a.status === 'screening_passed' || a.status === 'screening_failed') : []
  const passRate = screened.length > 0
    ? Math.round((screened.filter(a => a.status === 'screening_passed').length / screened.length) * 100)
    : 0

  if (loading) {
    return (
      <HrLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </HrLayout>
    )
  }

  return (
    <HrLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your recruitment activity</p>
          </div>
          <Link
            to="/hr/jobs/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Job
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HrStatCard
            label="Active Jobs"
            value={activeJobs}
            description="Jobs accepting applications"
          />
          <HrStatCard
            label="Total Candidates"
            value={totalCandidates}
            description="Across all your jobs"
          />
          <HrStatCard
            label="Pending Reviews"
            value={pendingReviews}
            description="Awaiting your review"
          />
          <HrStatCard
            label="Pass Rate"
            value={`${passRate}%`}
            description="Screening pass rate"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Jobs */}
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Recent Jobs</h2>
              <Link to="/hr/jobs" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {/* {jobs.length === 0 ? ( */}
              {!jobs ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No jobs yet. <Link to="/hr/jobs/new" className="text-primary hover:underline">Create one</Link>
                </div>
              ) : (
                jobs.map(job => (
                  <Link
                    key={job.id}
                    to={`/hr/jobs/${job.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{job.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{job.applicationCount || 0} applicants</p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Recent Applications</h2>
              <Link to="/hr/applications" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {/* {applications.length === 0 ? ( */}
              {!applications ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No applications yet</div>
              ) : (
                applications.map(app => (
                  <Link
                    key={app.id}
                    to={`/hr/applications/${app.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {app.candidate?.firstName} {app.candidate?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        for {app.job?.title}
                      </p>
                    </div>
                    <ApplicationStatusBadge status={app.status} />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </HrLayout>
  )
}
