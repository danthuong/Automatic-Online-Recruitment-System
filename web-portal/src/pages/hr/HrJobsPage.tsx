import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Briefcase, Edit, Eye, Pause, Play, XCircle } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { jobService } from '@/services/hrService'
import type { JobResponse } from '@/types/job'
import { JobStatus } from '@/types/index'
import toast from 'react-hot-toast'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
  [JobStatus.ACTIVE]: { label: 'Active', variant: 'success' },
  [JobStatus.DRAFT]: { label: 'Draft', variant: 'secondary' },
  [JobStatus.PAUSED]: { label: 'Paused', variant: 'warning' },
  [JobStatus.CLOSED]: { label: 'Closed', variant: 'destructive' },
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: JobStatus.ACTIVE, label: 'Active' },
  { value: JobStatus.DRAFT, label: 'Draft' },
  { value: JobStatus.PAUSED, label: 'Paused' },
  { value: JobStatus.CLOSED, label: 'Closed' },
]

const PAGE_SIZE = 10

export function HrJobsPage() {

  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchJobs = useCallback(
    async (filters: { page: number; search: string; status: string }) => {
      setLoading(true)
      try {
        const result = await jobService.getMyJobs({
          page: filters.page,
          search: filters.search || undefined,
          status: filters.status || undefined,
          limit: PAGE_SIZE,
        })
        setJobs(result.data)
        setTotal(result.pagination.total)
      } catch {
        setJobs([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs({ page: 1, search, status: statusFilter })
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  useEffect(() => {
    fetchJobs({ page, search, status: statusFilter })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    try {
      await jobService.updateStatus(jobId, newStatus)
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
      )
      toast.success(`Job ${newStatus === JobStatus.ACTIVE ? 'published' : newStatus === JobStatus.PAUSED ? 'paused' : 'closed'}`)
    } catch {
      toast.error('Failed to update job status')
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Jobs</h1>
            <p className="text-muted-foreground mt-1">Manage your job postings</p>
          </div>
          <Link to="/hr/jobs/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No jobs found</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              {search || statusFilter ? 'Try adjusting your filters' : 'Create your first job posting'}
            </p>
            {!search && !statusFilter && (
              <Link to="/hr/jobs/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Job
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <>
            <div className="grid gap-3">
              {jobs.map((job) => {
                const statusCfg = STATUS_CONFIG[job.status] || { label: job.status, variant: 'secondary' as const }
                return (
                  <Card key={job.id} className="hover:border-primary/20 transition-colors">
                    <CardContent className="p-5 flex items-center gap-4">
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
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{job.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.company?.name} &middot; {job.location || 'Remote'} &middot;{' '}
                            {new Date(job.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-medium">{job.applicationCount} apps</span>
                        <Badge variant={statusCfg.variant} className="text-xs">
                          {statusCfg.label}
                        </Badge>
                        <Link to={`/hr/jobs/${job.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/hr/jobs/${job.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        {job.status === JobStatus.ACTIVE && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600"
                            onClick={() => handleStatusChange(job.id, JobStatus.PAUSED)}
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        )}
                        {job.status === JobStatus.PAUSED && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600"
                            onClick={() => handleStatusChange(job.id, JobStatus.ACTIVE)}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {(job.status === JobStatus.ACTIVE || job.status === JobStatus.PAUSED) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleStatusChange(job.id, JobStatus.CLOSED)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
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
