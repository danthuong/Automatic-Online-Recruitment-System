import { useState, useEffect, useCallback } from 'react'
import { Search, Briefcase, SlidersHorizontal, X } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { JobCard } from '@/components/JobCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { jobService } from '@/services/jobService'
import type { JobResponse, JobFilters } from '@/types/job'
import { JobStatus } from '@/types/index'

const PAGE_SIZE = 12

const experienceOptions = [
  { value: '', label: 'All Levels' },
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
]

const locationOptions = [
  { value: '', label: 'All Locations' },
  { value: 'New York', label: 'New York' },
  { value: 'San Francisco', label: 'San Francisco' },
  { value: 'Remote', label: 'Remote' },
  { value: 'London', label: 'London' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Berlin', label: 'Berlin' },
]

export function JobsPage() {
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [experience, setExperience] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const fetchJobs = useCallback(
    async (filters: JobFilters) => {
      setLoading(true)
      try {
        const result = await jobService.getAll({ ...filters, status: JobStatus.ACTIVE, limit: PAGE_SIZE })
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
      fetchJobs({ page: 1, search, location, experienceLevel: experience, remote: remoteOnly || undefined })
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, location, experience, remoteOnly])

  useEffect(() => {
    fetchJobs({ page, search, location, experienceLevel: experience, remote: remoteOnly || undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasActiveFilters = search || location || experience || remoteOnly

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Browse Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Find your next opportunity from {total} open positions
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, skills, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {locationOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {experienceOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <Button
              variant={remoteOnly ? 'default' : 'outline'}
              size="icon"
              onClick={() => setRemoteOnly(!remoteOnly)}
              title="Remote only"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </Button>

            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-sm text-muted-foreground">Filters:</span>
            {search && (
              <FilterChip label={`"${search}"`} onRemove={() => setSearch('')} />
            )}
            {location && (
              <FilterChip label={location} onRemove={() => setLocation('')} />
            )}
            {experience && (
              <FilterChip label={experienceOptions.find((o) => o.value === experience)?.label || experience} onRemove={() => setExperience('')} />
            )}
            {remoteOnly && <FilterChip label="Remote" onRemove={() => setRemoteOnly(false)} />}
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => { setSearch(''); setLocation(''); setExperience(''); setRemoteOnly(false) }}
            >
              Clear all
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No jobs found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
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

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-primary/70">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
