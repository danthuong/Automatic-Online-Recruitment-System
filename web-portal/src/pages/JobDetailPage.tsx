import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, MapPin, Clock, Briefcase, DollarSign, Building2, CheckCircle2, Users, Calendar } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { jobService } from '@/services/jobService'
import { applicationService } from '@/services/applicationService'
import { useAuth } from '@/hooks/useAuth'
import type { JobResponse } from '@/types/job'
import { JobStatus, JobType, ExperienceLevel } from '@/types/index'

const jobTypeLabels: Record<JobType, string> = {
  [JobType.FULL_TIME]: 'Full-time',
  [JobType.PART_TIME]: 'Part-time',
  [JobType.CONTRACT]: 'Contract',
  [JobType.INTERNSHIP]: 'Internship',
}

const experienceLabels: Record<ExperienceLevel, string> = {
  [ExperienceLevel.INTERN]: 'Intern',
  [ExperienceLevel.JUNIOR]: 'Junior',
  [ExperienceLevel.MID]: 'Mid-Level',
  [ExperienceLevel.SENIOR]: 'Senior',
  [ExperienceLevel.LEAD]: 'Lead',
  [ExperienceLevel.MANAGER]: 'Manager',
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      jobService.getById(id),
      applicationService.hasApplied(id).catch(() => false),
    ])
      .then(([jobData, alreadyApplied]) => {
        setJob(jobData)
        setApplied(alreadyApplied)
      })
      .catch(() => {
        toast.error('Job not found')
        navigate('/jobs')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleApply = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!job) return
    setApplying(true)
    try {
      await applicationService.apply(job.id)
      setApplied(true)
      toast.success('Application submitted successfully!')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to submit application'
      toast.error(message)
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!job) return null

  const postedDate = new Date(job.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to jobs
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  {job.company?.logoUrl ? (
                    <img
                      src={job.company.logoUrl}
                      alt={job.company.name}
                      className="w-16 h-16 rounded-xl object-cover border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h1 className="text-2xl font-bold">{job.title}</h1>
                        {job.company && (
                          <Link
                            to={`/companies/${job.companyId}`}
                            className="text-muted-foreground hover:text-primary transition-colors text-sm mt-0.5 inline-block"
                          >
                            {job.company.name}
                          </Link>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="capitalize text-sm"
                      >
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {job.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary" />
                      {job.location}
                    </span>
                  )}
                  {job.jobType && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-primary" />
                      {jobTypeLabels[job.jobType as JobType] || job.jobType}
                    </span>
                  )}
                  {job.experienceLevel && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary" />
                      {experienceLabels[job.experienceLevel as ExperienceLevel] || job.experienceLevel}
                    </span>
                  )}
                  {job.remote && (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Remote Friendly
                    </span>
                  )}
                </div>

                {job.summary && (
                  <div>
                    <h2 className="font-semibold mb-2">Summary</h2>
                    <p className="text-sm text-muted-foreground">{job.summary}</p>
                  </div>
                )}

                <div>
                  <h2 className="font-semibold mb-3">About this role</h2>
                  <div
                    className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: job.description }}
                  />
                </div>

                {job.requiredSkills.length > 0 && (
                  <div>
                    <h2 className="font-semibold mb-3">Required Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {job.requiredSkills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {job.preferredSkills && job.preferredSkills.length > 0 && (
                  <div>
                    <h2 className="font-semibold mb-3">Nice to Have</h2>
                    <div className="flex flex-wrap gap-2">
                      {job.preferredSkills.map((skill) => (
                        <Badge key={skill} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="sticky top-24">
              <CardHeader>
                <h3 className="font-semibold">About this job</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.salary && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Salary</p>
                      <p className="text-sm font-medium">
                        {job.salary.min && job.salary.max
                          ? `${job.salary.currency || 'USD'} ${(job.salary.min / 1000).toFixed(0)}k - ${(job.salary.max / 1000).toFixed(0)}k`
                          : job.salary.isNegotiable
                          ? 'Negotiable'
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Posted</p>
                    <p className="text-sm font-medium">{postedDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hiring</p>
                    <p className="text-sm font-medium">{job.hiringCount} position{job.hiringCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {job.testConfig && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Assessment</p>
                      <p className="text-sm font-medium">{job.testConfig.totalTime} min test</p>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleApply}
                    isLoading={applying}
                    disabled={applied || job.status !== JobStatus.ACTIVE}
                  >
                    {applied ? 'Already Applied' : 'Apply Now'}
                  </Button>
                  {applied && (
                    <p className="text-xs text-center text-success mt-2">
                      Your application has been submitted
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
