import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit, Users, Clock, Briefcase, MapPin,
  CheckCircle2, XCircle, AlertCircle, FileText, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { jobService } from '@/services/hrService'
import { applicationService } from '@/services/applicationService'
import type { JobResponse } from '@/types/job'
import type { ApplicationResponse } from '@/types/job'
import { JobStatus, ApplicationStatus } from '@/types/index'
import { cn } from '@/lib/utils'

const PIPELINE_STAGES = [
  { key: ApplicationStatus.PENDING, label: 'Applied', icon: FileText, color: 'text-blue-600 bg-blue-50' },
  { key: ApplicationStatus.SCREENING, label: 'Screening', icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
  { key: ApplicationStatus.SCREENING_PASSED, label: 'Passed', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  { key: ApplicationStatus.SCHEDULED, label: 'Scheduled', icon: Clock, color: 'text-purple-600 bg-purple-50' },
  { key: ApplicationStatus.TEST_COMPLETED, label: 'Test Done', icon: CheckCircle2, color: 'text-cyan-600 bg-cyan-50' },
  { key: ApplicationStatus.OFFERED, label: 'Offered', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  { key: ApplicationStatus.REJECTED, label: 'Rejected', icon: XCircle, color: 'text-red-600 bg-red-50' },
]

const APP_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
  [ApplicationStatus.PENDING]: { label: 'Applied', variant: 'secondary' },
  [ApplicationStatus.SCREENING]: { label: 'Screening', variant: 'warning' },
  [ApplicationStatus.SCREENING_PASSED]: { label: 'Passed', variant: 'success' },
  [ApplicationStatus.SCREENING_FAILED]: { label: 'Rejected', variant: 'destructive' },
  [ApplicationStatus.SCHEDULED]: { label: 'Scheduled', variant: 'default' },
  [ApplicationStatus.TEST_COMPLETED]: { label: 'Test Done', variant: 'success' },
  [ApplicationStatus.OFFERED]: { label: 'Offered', variant: 'success' },
  [ApplicationStatus.REJECTED]: { label: 'Rejected', variant: 'destructive' },
}

const JOB_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
  [JobStatus.ACTIVE]: { label: 'Active', variant: 'success' },
  [JobStatus.DRAFT]: { label: 'Draft', variant: 'secondary' },
  [JobStatus.PAUSED]: { label: 'Paused', variant: 'warning' },
  [JobStatus.CLOSED]: { label: 'Closed', variant: 'destructive' },
}

export function HrJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobResponse | null>(null)
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 10

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [jobData, appsData] = await Promise.all([
        jobService.getById(id),
        applicationService.getByJob(id, { status: statusFilter || undefined, page, limit: PAGE_SIZE }),
      ])
      setJob(jobData)
      setApplications(appsData.data)
      setTotal(appsData.pagination.total)
    } catch {
      toast.error('Failed to load job')
      navigate('/hr/jobs')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, statusFilter, page])

  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getStageCount = (status: ApplicationStatus) =>
    applications.filter((a) => a.status === status).length

  const totalApps = applications.length
  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const jobStatusCfg = JOB_STATUS_CONFIG[job.status] || { label: job.status, variant: 'secondary' as const }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to jobs
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {job.company?.logoUrl ? (
              <img src={job.company.logoUrl} alt={job.company.name} className="w-16 h-16 rounded-xl object-cover border" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <p className="text-muted-foreground">
                {job.company?.name} &middot; {job.location || 'Remote'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={jobStatusCfg.variant} className="text-xs">{jobStatusCfg.label}</Badge>
                <span className="text-xs text-muted-foreground">{totalApps} applications</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/hr/jobs/${job.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-2 flex-wrap">
              {PIPELINE_STAGES.map((stage) => {
                const count = getStageCount(stage.key)
                return (
                  <button
                    key={stage.key}
                    onClick={() => setStatusFilter(statusFilter === stage.key ? '' : stage.key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                      statusFilter === stage.key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold', stage.color)}>
                      {count}
                    </span>
                    <span className="text-muted-foreground">{stage.label}</span>
                  </button>
                )
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Applications ({total})</CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No applications yet</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {applications.map((app) => {
                        const cfg = APP_STATUS_CONFIG[app.status] || { label: app.status, variant: 'secondary' as const }
                        const candidate = app.candidate
                        return (
                          <Link key={app.id} to={`/hr/applications/${app.id}`} className="block group">
                            <div className="flex items-center gap-4 p-3 rounded-lg border hover:border-primary/30 transition-all">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                                {candidate?.user?.firstName?.[0]}{candidate?.user?.lastName?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                                  {candidate?.user?.firstName} {candidate?.user?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {candidate?.email}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {app.cvScore !== undefined && (
                                  <span className="text-sm font-medium">Score: {app.cvScore}</span>
                                )}
                                <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground px-3">
                          Page {page} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Job Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.testConfig && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{job.testConfig.totalTime} min test</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{job.hiringCount} position{job.hiringCount !== 1 ? 's' : ''}</span>
                </div>

                {job.requiredSkills.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.requiredSkills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {job.preferredSkills && job.preferredSkills.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Preferred Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.preferredSkills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {job.testConfig && (
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Test Config</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium">{job.testConfig.totalTime} min</span>
                      <span className="text-muted-foreground">Pass Score:</span>
                      <span className="font-medium">{job.testConfig.passingScore}%</span>
                      <span className="text-muted-foreground">Code:</span>
                      <span className="font-medium">{job.testConfig.codeQuestionCount || 0}</span>
                      <span className="text-muted-foreground">Essay:</span>
                      <span className="font-medium">{job.testConfig.essayQuestionCount || 0}</span>
                      <span className="text-muted-foreground">MCQ:</span>
                      <span className="font-medium">{job.testConfig.mcqQuestionCount || 0}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
