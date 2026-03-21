import { useState, useEffect, useCallback } from 'react'
import { Search, Building2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { CompanyCard } from '@/components/CompanyCard'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { companyService } from '@/services/companyService'
import type { CompanyResponse, CompanyFilters } from '@/types/job'

const PAGE_SIZE = 12

const industryOptions = [
  { value: '', label: 'All Industries' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Education', label: 'Education' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Media', label: 'Media & Entertainment' },
  { value: 'Manufacturing', label: 'Manufacturing' },
]

export function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('')

  const fetchCompanies = useCallback(
    async (filters: CompanyFilters) => {
      setLoading(true)
      try {
        const result = await companyService.getAll({ ...filters, limit: PAGE_SIZE })
        setCompanies(result.data)
        setTotal(result.pagination.total)
      } catch {
        setCompanies([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies({ page: 1, search, industry })
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, industry])

  useEffect(() => {
    fetchCompanies({ page, search, industry })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Browse Companies</h1>
          <p className="text-muted-foreground mt-1">
            Discover {total} companies hiring on LotusHack
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search companies by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[180px]"
          >
            {industryOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No companies found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-input disabled:opacity-50 hover:bg-accent transition-colors"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-input disabled:opacity-50 hover:bg-accent transition-colors"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
