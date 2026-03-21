import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, DollarSign, Users, Clock } from 'lucide-react'
import { HrLayout } from '@/components/hr/HrLayout'
import { Button } from '@/components/ui/button'
import { JobStatusBadge } from '@/components/hr/JobStatusBadge'
import { ApplicationStatusBadge } from '@/components/hr/ApplicationStatusBadge'
import { hrService } from '@/services/hrService'
import type { JobResponse } from '@/types/job'
import type { ApplicationResponse } from '@/types/job'

export function HrJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobResponse | null>(null)
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      try {
        const [jobRes, appsRes] = await Promise.all([
          hrService.getJob(id),
          hrService.getApplicationsByJob(id, { limit: 20 }),
        ])
        setJob(jobRes)
        setApplications(appsRes.data)
      } catch {
        navigate('/hr/jobs')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, navigate])

  const handleStatusChange = async (status: string) => {
    if (!id || !job) return
    try {
      const updated = await hrService.updateJobStatus(id, status)
      setJob(updated)
    } catch {
      // handle error
    }
  }

  if (loading) {
    return (
      <HrLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </HrLayout>
    )
  }

  if (!job) return null

  return (
    <HrLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/hr/jobs')}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            {job.company && <p className="text-muted-foreground">{job.company.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            <JobStatusBadge status={job.status} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/hr/jobs/${id}/edit`)}
            >
              Edit Job
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Job Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {job.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{job.location}{job.remote ? ' (Remote)' : ''}</span>
                  </div>
                )}
                {job.salary && (job.salary.min || job.salary.max) && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      {job.salary.min && job.salary.max
                        ? `$${job.salary.min}–$${job.salary.max}`
                        : job.salary.min
                          ? `From $${job.salary.min}`
                          : `Up to $${job.salary.max}`}
                      {job.salary.currency && ` ${job.salary.currency}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{job.applicationCount || 0} applicants</span>
                </div>
                {job.testConfig && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{job.testConfig.totalTime} min test</span>
                  </div>
                )}
              </div>

              {job.requiredSkills && job.requiredSkills.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.requiredSkills.map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.description && (
                <div>
                  <p className="text-sm font-medium mb-2">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                </div>
              )}
            </div>

            {/* Status Actions */}
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium mb-3">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {(['active', 'draft', 'paused', 'closed'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={job.status === s}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      job.status === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent hover:bg-accent/80'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <h3 className="font-semibold">Details</h3>
              <div className="space-y-2 text-sm">
                {job.experienceLevel && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-medium capitalize">{job.experienceLevel}</span>
                  </div>
                )}
                {job.jobType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium capitalize">{job.jobType.replace('-', ' ')}</span>
                  </div>
                )}
                {job.hiringCount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hiring</span>
                    <span className="font-medium">{job.hiringCount} position{job.hiringCount > 1 ? 's' : ''}</span>
                  </div>
                )}
                {job.testConfig && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Test Time</span>
                      <span className="font-medium">{job.testConfig.totalTime} min</span>
                    </div>
                    {job.testConfig.passingScore && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pass Score</span>
                        <span className="font-medium">{job.testConfig.passingScore}%</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Applications */}
            <div className="bg-card rounded-xl border border-border">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Applicants</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {applications.length}
                </span>
              </div>
              <div className="divide-y divide-border">
                {/* {applications.length === 0 ? ( */}
                {!applications ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No applicants yet</div>
                ) : (
                  applications.slice(0, 5).map(app => (
                    <button
                      key={app.id}
                      onClick={() => navigate(`/hr/applications/${app.id}`)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent/50 text-left transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {app.candidate?.firstName} {app.candidate?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ApplicationStatusBadge status={app.status} />
                    </button>
                  ))
                )}
                {applications.length > 5 && (
                  <button
                    onClick={() => navigate(`/hr/applications?jobId=${id}`)}
                    className="w-full px-5 py-3 text-sm text-primary hover:bg-primary/5 transition-colors"
                  >
                    View all {applications.length} applicants
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </HrLayout>
  )
}
