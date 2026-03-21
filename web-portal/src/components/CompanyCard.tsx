import { Link } from 'react-router-dom'
import { MapPin, Globe, Users, Briefcase } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CompanyResponse } from '@/types/job'

interface CompanyCardProps {
  company: CompanyResponse
  jobCount?: number
}

export function CompanyCard({ company, jobCount }: CompanyCardProps) {
  return (
    <Link to={`/companies/${company.id}`} className="block">
      <Card className="hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-primary">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base hover:text-primary transition-colors line-clamp-1">
                  {company.name}
                </h3>
                {company.isVerified && (
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              {company.industry && (
                <Badge variant="secondary" className="mt-1 text-xs font-normal">
                  {company.industry}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {company.description || 'No description provided.'}
          </p>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {company.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {company.location}
              </span>
            )}
            {company.website && (
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px]">
                  {company.website.replace(/^https?:\/\//, '')}
                </span>
              </span>
            )}
            {company.size && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {company.size}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              {jobCount !== undefined ? `${jobCount} open position${jobCount !== 1 ? 's' : ''}` : 'View company'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
