import { Link } from 'react-router-dom'
import { MapPin, Clock, Briefcase, DollarSign, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { JobResponse } from '@/types/job'
import { JobStatus, JobType, ExperienceLevel } from '@/types/index'

interface JobCardProps {
  job: JobResponse
}

const statusColors: Record<JobStatus, string> = {
  [JobStatus.ACTIVE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [JobStatus.DRAFT]: 'bg-gray-100 text-gray-600 border-gray-200',
  [JobStatus.PAUSED]: 'bg-amber-100 text-amber-700 border-amber-200',
  [JobStatus.CLOSED]: 'bg-red-100 text-red-700 border-red-200',
}

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

export function JobCard({ job }: JobCardProps) {
  const formatSalary = (salary?: { min?: number; max?: number; currency?: string }) => {
    if (!salary?.min && !salary?.max) return null
    const currency = salary.currency || 'USD'
    const fmt = (n: number) => `${currency} ${(n / 1000).toFixed(0)}k`
    if (salary.min && salary.max) return `${fmt(salary.min)} - ${fmt(salary.max)}`
    if (salary.min) return `From ${fmt(salary.min)}`
    return `Up to ${fmt(salary.max!)}`
  }

  const postedDate = new Date(job.createdAt)
  const now = new Date()
  const daysAgo = Math.floor((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24))
  const timeAgo = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`

  return (
    <Link to={`/jobs/${job.id}`} className="block">
      <Card className="hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {job.company?.logoUrl ? (
                <img
                  src={job.company.logoUrl}
                  alt={job.company.name}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-base leading-tight line-clamp-2 hover:text-primary transition-colors">
                  {job.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {job.company?.name || 'Company'}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'flex-shrink-0 text-xs capitalize',
                statusColors[job.status as JobStatus] || statusColors[JobStatus.ACTIVE]
              )}
            >
              {job.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{job.summary || job.description.replace(/<[^>]*>/g, '').slice(0, 150)}</p>

          <div className="flex flex-wrap gap-2">
            {job.requiredSkills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs font-normal">
                {skill}
              </Badge>
            ))}
            {job.requiredSkills.length > 4 && (
              <Badge variant="secondary" className="text-xs font-normal">
                +{job.requiredSkills.length - 4}
              </Badge>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1 border-t">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {job.location}
              </span>
            )}
            {job.jobType && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {jobTypeLabels[job.jobType as JobType] || job.jobType}
              </span>
            )}
            {job.experienceLevel && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {experienceLabels[job.experienceLevel as ExperienceLevel] || job.experienceLevel}
              </span>
            )}
            {job.salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {formatSalary(job.salary)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            <span className="text-xs text-muted-foreground">
              {job.applicationCount} applicant{job.applicationCount !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
