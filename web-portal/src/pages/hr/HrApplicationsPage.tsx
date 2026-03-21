import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { HrLayout } from '@/components/hr/HrLayout'
import { ApplicationStatusBadge } from '@/components/hr/ApplicationStatusBadge'
import { hrService } from '@/services/hrService'
import type { ApplicationResponse } from '@/types/job'

export function HrApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = 15
  const status = searchParams.get('status') || ''

  const fetchApps = useCallback(async () => {
    setLoading(true)
    try {
      const res = await hrService.getAllApplications({
        page,
        limit,
        status: status || undefined,
      })
      setApplications(res.data)
      setTotal(res.pagination.total)
    } catch {
      // handle error
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => { fetchApps() }, [fetchApps])

  const totalPages = Math.ceil(total / limit)

  return (
    <HrLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground mt-1">{total} application{total !== 1 ? 's' : ''}</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by candidate name..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={status}
            onChange={e => setSearchParams(p => { p.set('status', e.target.value); p.set('page', '1'); return p })}
            className="px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="screening">Screening</option>
            <option value="screening_passed">Screening Passed</option>
            <option value="screening_failed">Screening Failed</option>
            <option value="scheduled">Scheduled</option>
            <option value="test_completed">Test Completed</option>
            <option value="offered">Offered</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          // ) : applications.length === 0 ? (
            ) : !applications ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-50" />
              <p className="font-medium">No applications found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Candidate</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Job</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Applied</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Score</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {applications.map(app => (
                  <tr
                    key={app.id}
                    className="hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/hr/applications/${app.id}`)}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium">
                        {app.candidate?.firstName} {app.candidate?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{app.candidate?.email}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-sm">{app.job?.title}</p>
                      {app.job?.company && (
                        <p className="text-xs text-muted-foreground">{app.job.company.name}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      {app.cvScore !== undefined ? (
                        <span className={`text-sm font-medium ${
                          app.cvScore >= 80 ? 'text-emerald-600' :
                          app.cvScore >= 60 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {app.cvScore}%
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4"><ApplicationStatusBadge status={app.status} /></td>
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
