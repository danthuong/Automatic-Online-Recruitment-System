import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase, Building2, MapPin, ArrowRight, FileText,
  Clock, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { applicationService } from '@/services/applicationService'
import type { ApplicationResponse } from '@/types/job'
import { ApplicationStatus } from '@/types/index'
import { cn } from '@/lib/utils'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: ApplicationStatus.PENDING, label: 'Applied' },
  { value: ApplicationStatus.SCREENING, label: 'Screening' },
  { value: ApplicationStatus.SCREENING_PASSED, label: 'Passed' },
  { value: ApplicationStatus.SCHEDULED, label: 'Scheduled' },
  { value: ApplicationStatus.TEST_COMPLETED, label: 'Test Done' },
  { value: ApplicationStatus.OFFERED, label: 'Offered' },
  { value: ApplicationStatus.REJECTED, label: 'Rejected' },
]

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'; icon: React.ElementType }> = {
  [ApplicationStatus.PENDING]: { label: 'Applied', variant: 'secondary', icon: FileText },
  [ApplicationStatus.SCREENING]: { label: 'Screening', variant: 'warning', icon: AlertCircle },
  [ApplicationStatus.SCREENING_PASSED]: { label: 'Passed', variant: 'success', icon: CheckCircle2 },
  [ApplicationStatus.SCREENING_FAILED]: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  [ApplicationStatus.SCHEDULED]: { label: 'Scheduled', variant: 'default', icon: Clock },
  [ApplicationStatus.TEST_COMPLETED]: { label: 'Test Done', variant: 'success', icon: CheckCircle2 },
  [ApplicationStatus.OFFERED]: { label: 'Offered', variant: 'success', icon: CheckCircle2 },
  [ApplicationStatus.REJECTED]: { label: 'Rejected', variant: 'destructive', icon: XCircle },
}

const PAGE_SIZE = 10

export function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')

  const fetchApplications = useCallback(
    async (status: string, pageNum: number) => {
      setLoading(true)
      try {
        const result = await applicationService.getMyApplications({
          status: status || undefined,
          page: pageNum,
          limit: PAGE_SIZE,
        })
        setApplications(result.data)
        setTotal(result.pagination.total)
      } catch {
        setApplications([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    setPage(1)
    fetchApplications(activeTab, 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    fetchApplications(activeTab, page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Applications</h1>
          <p className="text-muted-foreground mt-1">
            Track your job applications and interview progress
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors flex-shrink-0',
                activeTab === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : applications.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No applications yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              {activeTab
                ? `No applications with status "${STATUS_TABS.find((t) => t.value === activeTab)?.label}"`
                : "Start applying to jobs to see your applications here"}
            </p>
            <Link to="/jobs">
              <Button>
                Browse Jobs <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {applications.map((app) => {
                const cfg = STATUS_CONFIG[app.status] || { label: app.status, variant: 'secondary' as const, icon: FileText }
                const StatusIcon = cfg.icon
                const job = app.job

                return (
                  <Link key={app.id} to={`/applications/${app.id}`} className="block group">
                    <Card className="hover:border-primary/30 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          {job?.company?.logoUrl ? (
                            <img
                              src={job.company.logoUrl}
                              alt={job.company.name}
                              className="w-12 h-12 rounded-xl object-cover border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold group-hover:text-primary transition-colors truncate">
                              {job?.title || 'Unknown Position'}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                              <span>{job?.company?.name || 'Unknown Company'}</span>
                              {job?.location && (
                                <>
                                  <span>&middot;</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {job.location}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Applied {new Date(app.appliedAt).toLocaleDateString()}
                              </span>
                              {app.cvScore !== undefined && (
                                <span className="font-medium">Score: {app.cvScore}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={cn('w-4 h-4', {
                              'text-success': cfg.variant === 'success',
                              'text-destructive': cfg.variant === 'destructive',
                              'text-warning': cfg.variant === 'warning',
                              'text-muted-foreground': cfg.variant === 'secondary' || cfg.variant === 'default',
                            })} />
                            <Badge variant={cfg.variant} className="text-xs">
                              {cfg.label}
                            </Badge>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
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
      </main>
    </div>
  )
}
