import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Globe, Users, Calendar, Briefcase, ExternalLink } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { JobCard } from '@/components/JobCard'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { jobService } from '@/services/jobService'
import { companyService } from '@/services/companyService'
import type { CompanyResponse, JobResponse } from '@/types/job'
import { JobStatus } from '@/types/index'

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [company, setCompany] = useState<CompanyResponse | null>(null)
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    companyService.getById(id)
      .then(setCompany)
      .catch(() => {
        navigate('/companies')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    if (!id || !company) return
    jobService.getByCompany(id, { status: JobStatus.ACTIVE, limit: 20 })
      .then((result) => setJobs(result.data))
      .catch(() => setJobs([]))
  }, [id, company])

  if (loading || !company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to companies
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-4">
                <div className="flex flex-col items-center text-center">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="w-24 h-24 rounded-2xl object-cover border mb-4"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <span className="text-4xl font-bold text-primary">
                        {company.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{company.name}</h1>
                    {company.isVerified && (
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  {company.industry && (
                    <Badge variant="secondary" className="mt-2">{company.industry}</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {company.description && (
                  <div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {company.description}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {company.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span>{company.location}</span>
                    </div>
                  )}
                  {company.size && (
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span>{company.size} employees</span>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {company.foundedYear && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span>Founded {company.foundedYear}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium">
                    {jobs.length} open position{jobs.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Open Positions</h2>
            </div>

            {/* {jobs.length === 0 ? ( */}
            {!jobs ? (
              <div className="text-center py-16">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No open positions</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  This company is not hiring at the moment
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
