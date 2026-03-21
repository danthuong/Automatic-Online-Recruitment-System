import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react'
import { HrLayout } from '@/components/hr/HrLayout'
import { JobStatusBadge } from '@/components/hr/JobStatusBadge'
import { hrService } from '@/services/hrService'
import type { JobResponse } from '@/types/job'

export function HrJobsPage() {
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = 10
  const status = searchParams.get('status') || ''
  const search = searchParams.get('search') || ''

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await hrService.getMyJobs({
        page,
        limit,
        status: status || undefined,
        search: search || undefined,
      })
      setJobs(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      console.error('Error fetching jobs:', err)
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const totalPages = Math.ceil(total / limit)

  return (
    <HrLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Jobs</h1>
            <p className="text-muted-foreground mt-1">{total} job{total !== 1 ? 's' : ''} total</p>
          </div>
          <Link
            to="/hr/jobs/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Job
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={e => {
                setSearchParams(p => { p.set('search', e.target.value); p.set('page', '1'); return p })
              }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={status}
            onChange={e => setSearchParams(p => { p.set('status', e.target.value); p.set('page', '1'); return p })}
            className="px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          // ) : jobs.length === 0 ? (
          ) : !jobs ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Briefcase className="w-10 h-10 mb-3 opacity-50" />
              <p className="font-medium">No jobs found</p>
              <p className="text-sm mt-1">Create your first job posting</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Job</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Applicants</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map(job => (
                  <tr
                    key={job.id}
                    className="hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/hr/jobs/${job.id}`)}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium">{job.title}</p>
                      {job.company && <p className="text-xs text-muted-foreground mt-0.5">{job.company.name}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {job.location || '-'}
                      {job.remote && <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Remote</span>}
                    </td>
                    <td className="px-5 py-4 text-sm hidden md:table-cell">{job.applicationCount || 0}</td>
                    <td className="px-5 py-4"><JobStatusBadge status={job.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setSearchParams(p => { p.set('page', String(page - 1)); return p })}
                className="p-2 rounded-lg border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm px-3 py-1">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setSearchParams(p => { p.set('page', String(page + 1)); return p })}
                className="p-2 rounded-lg border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </HrLayout>
  )
}
