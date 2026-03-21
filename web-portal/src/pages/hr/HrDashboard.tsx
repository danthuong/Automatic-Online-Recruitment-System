import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  Users,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { jobService } from '@/services/hrService'
import { applicationService } from '@/services/hrService'
import type { JobResponse } from '@/types/job'
import { JobStatus } from '@/types/index'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
  [JobStatus.ACTIVE]: { label: 'Active', variant: 'success' },
  [JobStatus.DRAFT]: { label: 'Draft', variant: 'secondary' },
  [JobStatus.PAUSED]: { label: 'Paused', variant: 'warning' },
  [JobStatus.CLOSED]: { label: 'Closed', variant: 'destructive' },
}

export function HrDashboard() {
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await jobService.getMyJobs({ limit: 20 })
      setJobs(result.data)

      const counts: Record<string, number> = {}
      await Promise.all(
        result.data.slice(0, 5).map(async (job) => {
          const apps = await applicationService.getByJob(job.id, { limit: 100 })
          counts[job.id] = apps.pagination.total
        })
      )
      setPipelineCounts(counts)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalApps = Object.values(pipelineCounts).reduce((sum, c) => sum + c, 0)
  const activeJobs = jobs.filter((j) => j.status === JobStatus.ACTIVE).length

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your recruitment pipeline</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Jobs', value: jobs.length, icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
                { label: 'Active Jobs', value: activeJobs, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
                { label: 'Total Applications', value: totalApps, icon: Users, color: 'text-purple-600 bg-purple-50' },
                { label: 'Pending Review', value: pipelineCounts[''] || 0, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', stat.color)}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Your Job Postings</h2>
                <Link to="/hr/jobs/create">
                  <Button size="sm">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Create Job
                  </Button>
                </Link>
              </div>

              {jobs.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">No jobs posted yet</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-6">
                    Create your first job posting to start receiving applications
                  </p>
                  <Link to="/hr/jobs/create">
                    <Button>
                      Create your first job <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {jobs.map((job) => {
                    const statusCfg = STATUS_CONFIG[job.status] || { label: job.status, variant: 'secondary' as const }
                    const appCount = pipelineCounts[job.id] || 0
                    return (
                      <Link key={job.id} to={`/hr/jobs/${job.id}`} className="block group">
                        <Card className="hover:border-primary/30 transition-all duration-200">
                          <CardContent className="p-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              {job.company?.logoUrl ? (
                                <img
                                  src={job.company.logoUrl}
                                  alt={job.company.name}
                                  className="w-12 h-12 rounded-xl object-cover border flex-shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Briefcase className="w-6 h-6 text-primary" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold group-hover:text-primary transition-colors truncate">
                                  {job.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {job.company?.name} &middot; {job.location || 'Remote'} &middot;{' '}
                                  {new Date(job.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="text-right hidden sm:block">
                                <p className="text-lg font-bold">{appCount}</p>
                                <p className="text-xs text-muted-foreground">applications</p>
                              </div>
                              <Badge variant={statusCfg.variant} className="text-xs">
                                {statusCfg.label}
                              </Badge>
                              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: <Briefcase className="w-5 h-5" />, title: 'Create Job', href: '/hr/jobs/create', desc: 'Post a new position' },
                  { icon: <Users className="w-5 h-5" />, title: 'View Jobs', href: '/hr/jobs', desc: 'Manage listings' },
                  { icon: <FileText className="w-5 h-5" />, title: 'Applications', href: '/jobs', desc: 'Browse candidates' },
                  { icon: <TrendingUp className="w-5 h-5" />, title: 'Reports', href: '/hr', desc: 'View analytics' },
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
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
