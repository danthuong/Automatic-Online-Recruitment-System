import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Building2,
  Users,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { JobCard } from '@/components/JobCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/useAuth'
import { jobService } from '@/services/jobService'
import { applicationService } from '@/services/applicationService'
import type { ApplicationResponse, JobResponse } from '@/types/job'
import { JobStatus, ApplicationStatus } from '@/types/index'
import { cn } from '@/lib/utils'

const PIPELINE_STAGES = [
  { key: 'pending', label: 'Applied', icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'screening', label: 'Screening', icon: AlertCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { key: 'scheduled', label: 'Scheduled', icon: Clock, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { key: 'test_completed', label: 'Test Done', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
]

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'; icon: React.ElementType }> = {
  [ApplicationStatus.PENDING]: { label: 'Applied', variant: 'secondary', icon: FileText },
  [ApplicationStatus.SCREENING]: { label: 'Screening', variant: 'warning', icon: AlertCircle },
  [ApplicationStatus.SCREENING_PASSED]: { label: 'Passed', variant: 'success', icon: CheckCircle2 },
  [ApplicationStatus.SCREENING_FAILED]: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  [ApplicationStatus.SCHEDULED]: { label: 'Scheduled', variant: 'default', icon: Clock },
  [ApplicationStatus.TEST_COMPLETED]: { label: 'Test Done', variant: 'success', icon: CheckCircle2 },
  [ApplicationStatus.OFFERED]: { label: 'Offered', variant: 'success', icon: TrendingUp },
  [ApplicationStatus.REJECTED]: { label: 'Rejected', variant: 'destructive', icon: XCircle },
}

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [featuredJobs, setFeaturedJobs] = useState<JobResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [appsResult, jobsResult] = await Promise.all([
        applicationService.getMyApplications({ limit: 5 }),
        jobService.getAll({ status: JobStatus.ACTIVE, limit: 6 }),
      ])
      setApplications(appsResult.data)
      setFeaturedJobs(jobsResult.data)
    } catch {
      // ignore errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = {
    total: applications.length,
    screening: applications.filter((a) =>
      [ApplicationStatus.PENDING, ApplicationStatus.SCREENING].includes(a.status as ApplicationStatus)
    ).length,
    scheduled: applications.filter((a) => a.status === ApplicationStatus.SCHEDULED).length,
    completed: applications.filter((a) =>
      [ApplicationStatus.TEST_COMPLETED, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED].includes(a.status as ApplicationStatus)
    ).length,
  }

  const getStageCount = (status: string) =>
    applications.filter((a) => a.status === status).length

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/jobs?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground p-8 sm:p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <p className="text-primary-foreground/70 text-sm font-medium mb-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Welcome back, {user?.firstName}!
                </h1>
                <p className="text-primary-foreground/70 mt-2 max-w-md">
                  Track your applications, discover new opportunities, and take the next step in your career.
                </p>
              </div>

              <form onSubmit={handleSearch} className="flex gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:bg-white/20"
                  />
                </div>
                <Button type="submit" variant="secondary" size="lg" className="h-11 px-6">
                  Search
                </Button>
              </form>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              {[
                { label: 'Total Applied', value: stats.total, icon: FileText },
                { label: 'In Review', value: stats.screening, icon: AlertCircle },
                { label: 'Scheduled', value: stats.scheduled, icon: Clock },
                { label: 'Completed', value: stats.completed, icon: CheckCircle2 },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-primary-foreground/60 font-medium">{stat.label}</span>
                    <stat.icon className="w-4 h-4 text-primary-foreground/50" />
                  </div>
                  <p className="text-2xl font-bold">{loading ? '-' : stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: <Briefcase className="w-5 h-5" />, title: 'Browse Jobs', href: '/jobs', desc: 'Find opportunities' },
            { icon: <Building2 className="w-5 h-5" />, title: 'Companies', href: '/companies', desc: 'Explore employers' },
            { icon: <Users className="w-5 h-5" />, title: 'My Applications', href: '/applications', desc: 'Track progress' },
          ].map((item) => (
            <Link key={item.href} to={item.href} className="block group">
              <Card className="h-full group-hover:border-primary/40 transition-all duration-200">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        {/* Application Pipeline
        {applications.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Application Pipeline</h2>
              <Link to="/applications" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PIPELINE_STAGES.map((stage, idx) => {
                const count = getStageCount(stage.key)
                const isActive = count > 0
                return (
                  <div key={stage.key} className="relative">
                    {idx < PIPELINE_STAGES.length - 1 && (
                      <div className="hidden sm:block absolute top-5 left-full w-full h-px bg-border -translate-x-1/2 z-0" style={{ width: 'calc(100% - 2rem)' }} />
                    )}
                    <Card className={cn('relative z-10', isActive ? 'border-primary/30 bg-primary/5' : '')}>
                      <CardContent className="p-4 text-center">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2', isActive ? stage.color : 'bg-muted text-muted-foreground')}>
                          <stage.icon className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold">{loading ? '-' : count}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{stage.label}</p>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </section>
        )} */}

        {/* Recent Applications */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Applications</h2>
            {applications.length > 0 && (
              <Link to="/applications" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          // ) : applications.length === 0 ? (
          ) : applications.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">No applications yet</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-6">
                Start exploring jobs and apply to your first opportunity
              </p>
              <Link to="/jobs">
                <Button>
                  Browse Jobs <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 5).map((app) => {
                const statusCfg = STATUS_CONFIG[app.status] || {
                  label: app.status,
                  variant: 'secondary' as const,
                  icon: FileText,
                }
                return (
                  <Link key={app.id} to={`/jobs/${app.jobId}`} className="block group">
                    <Card className="hover:border-primary/30 transition-all duration-200">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {app.job?.company?.logoUrl ? (
                            <img
                              src={app.job.company.logoUrl}
                              alt={app.job.company.name}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Briefcase className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {app.job?.title || 'Job Title'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {app.job?.company?.name || 'Company'} &middot;{' '}
                              {app.job?.location || 'Remote'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge variant={statusCfg.variant} className="text-xs gap-1">
                            <statusCfg.icon className="w-3 h-3" />
                            {statusCfg.label}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Featured Jobs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Featured Jobs</h2>
            <Link to="/jobs" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all jobs <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : featuredJobs.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">No jobs available</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Check back later for new opportunities
              </p>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredJobs.slice(0, 6).map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        {/* How It Works */}
        <section className="rounded-2xl border bg-card p-8 sm:p-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mt-2">Your journey from application to offer</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '01', icon: <Briefcase className="w-5 h-5" />, title: 'Apply', desc: 'Submit your application and CV for review' },
              { step: '02', icon: <AlertCircle className="w-5 h-5" />, title: 'AI Screening', desc: 'Our AI analyzes your profile and skills' },
              { step: '03', icon: <Clock className="w-5 h-5" />, title: 'Assessment', desc: 'Complete a proctored coding interview' },
              { step: '04', icon: <TrendingUp className="w-5 h-5" />, title: 'Get Results', desc: 'Receive your score and feedback' },
            ].map((item, idx) => (
              <div key={item.step} className="relative text-center">
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-px bg-border -translate-x-1/2" />
                )}
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 relative z-10">
                  {item.icon}
                </div>
                <p className="text-xs font-medium text-primary/60 mb-1">Step {item.step}</p>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
