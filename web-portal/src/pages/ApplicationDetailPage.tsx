import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, MapPin, Clock, FileText,
  CheckCircle2, XCircle, AlertCircle, Star,
  Play, Calendar, Download, Github, ExternalLink,
  Mail, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { applicationService } from '@/services/applicationService'
import { testService } from '@/services/testService'
import type { ApplicationResponse } from '@/types/job'
import type { TestResponse } from '@/types/index'
import { ApplicationStatus, TestStatus } from '@/types/index'
import { cn } from '@/lib/utils'

const PIPELINE_STAGES = [
  { key: ApplicationStatus.PENDING, label: 'Applied', icon: FileText },
  { key: ApplicationStatus.SCREENING, label: 'Screening', icon: AlertCircle },
  { key: ApplicationStatus.SCREENING_PASSED, label: 'Screening Passed', icon: CheckCircle2 },
  { key: ApplicationStatus.SCHEDULED, label: 'Scheduled', icon: Calendar },
  { key: ApplicationStatus.TEST_COMPLETED, label: 'Test Done', icon: CheckCircle2 },
  { key: ApplicationStatus.OFFERED, label: 'Offered', icon: Star },
]

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
  [ApplicationStatus.PENDING]: 'secondary',
  [ApplicationStatus.SCREENING]: 'warning',
  [ApplicationStatus.SCREENING_PASSED]: 'success',
  [ApplicationStatus.SCREENING_FAILED]: 'destructive',
  [ApplicationStatus.SCHEDULED]: 'default',
  [ApplicationStatus.TEST_COMPLETED]: 'success',
  [ApplicationStatus.OFFERED]: 'success',
  [ApplicationStatus.REJECTED]: 'destructive',
}

const TEST_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  [TestStatus.PENDING]: 'secondary',
  [TestStatus.READY]: 'success',
  [TestStatus.IN_PROGRESS]: 'warning',
  [TestStatus.SUBMITTED]: 'default',
  [TestStatus.GRADED]: 'success',
  [TestStatus.EXPIRED]: 'destructive',
}

function getStageIndex(status: string): number {
  const map: Record<string, number> = {
    [ApplicationStatus.PENDING]: 0,
    [ApplicationStatus.SCREENING]: 1,
    [ApplicationStatus.SCREENING_PASSED]: 1,
    [ApplicationStatus.SCREENING_FAILED]: 1,
    [ApplicationStatus.SCHEDULED]: 3,
    [ApplicationStatus.TEST_COMPLETED]: 4,
    [ApplicationStatus.OFFERED]: 5,
    [ApplicationStatus.REJECTED]: 1,
  }
  return map[status] ?? -1
}

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [application, setApplication] = useState<ApplicationResponse | null>(null)
  const [test, setTest] = useState<TestResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      applicationService.getById(id),
      testService.getByApplication(id).catch(() => null),
    ])
      .then(([app, t]) => {
        setApplication(app)
        setTest(t)
      })
      .catch(() => {
        toast.error('Failed to load application')
        navigate('/applications')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error('Please select both a date and time')
      return
    }
    setScheduleLoading(true)
    try {
      toast.success('Test scheduled! (Scheduling endpoint coming soon)')
    } catch {
      toast.error('Failed to schedule test')
    } finally {
      setScheduleLoading(false)
    }
  }

  if (loading || !application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const candidate = application.candidate
  const job = application.job
  const currentStage = getStageIndex(application.status)
  const screeningDetails = application.screeningDetails

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <button
          onClick={() => navigate('/applications')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applications
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {job?.company?.logoUrl ? (
              <img src={job.company.logoUrl} alt={job.company.name} className="w-14 h-14 rounded-xl object-cover border" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{job?.title || 'Unknown Position'}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <span>{job?.company?.name || 'Unknown Company'}</span>
                {job?.location && (
                  <>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                  </>
                )}
              </div>
              <Badge variant={STATUS_VARIANT[application.status]} className="mt-2">
                {application.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            </div>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Applied {new Date(application.appliedAt).toLocaleDateString()}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isActive = idx === currentStage
                  const isPast = idx < currentStage
                  const isFailed = (application.status === ApplicationStatus.SCREENING_FAILED || application.status === ApplicationStatus.REJECTED) && idx === currentStage
                  const Icon = isFailed ? XCircle : stage.icon
                  return (
                    <div key={stage.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                            isFailed
                              ? 'border-destructive bg-destructive/10 text-destructive'
                              : isActive
                              ? 'border-primary bg-primary text-primary-foreground scale-110'
                              : isPast
                              ? 'border-success bg-success text-white'
                              : 'border-muted bg-muted text-muted-foreground'
                          )}
                        >
                          <Icon className={cn('w-5 h-5', isActive && !isFailed && 'scale-110')} />
                        </div>
                        <span
                          className={cn(
                            'text-xs mt-2 font-medium text-center',
                            isFailed ? 'text-destructive' : isActive ? 'text-primary' : isPast ? 'text-success' : 'text-muted-foreground'
                          )}
                        >
                          {stage.label}
                        </span>
                      </div>
                      {idx < PIPELINE_STAGES.length - 1 && (
                        <div
                          className={cn(
                            'flex-1 h-0.5 mx-2',
                            isFailed ? 'bg-destructive/30' : idx < currentStage ? 'bg-success' : 'bg-muted'
                          )}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

        {(application.status === ApplicationStatus.SCREENING_FAILED || application.status === ApplicationStatus.REJECTED) && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-destructive">Application Rejected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {screeningDetails?.llmFeedback || 'Thank you for your interest. We encourage you to apply for other positions.'}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {screeningDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    AI Screening Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="text-3xl font-bold text-blue-600">{screeningDetails.skillMatchScore ?? '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Skill Match</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-100">
                      <p className="text-3xl font-bold text-purple-600">{screeningDetails.experienceMatchScore ?? '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Experience</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-amber-50 border border-amber-100">
                      <p className="text-3xl font-bold text-amber-600">{screeningDetails.educationMatchScore ?? '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Education</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-3xl font-bold text-primary">{screeningDetails.overallScore ?? '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Overall</p>
                    </div>
                  </div>

                  {screeningDetails.githubAnalysis && (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Github className="w-4 h-4" />
                        GitHub Analysis
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Repositories</p>
                          <p className="font-medium">{screeningDetails.githubAnalysis.repos ?? 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Stars</p>
                          <p className="font-medium">{screeningDetails.githubAnalysis.stars ?? 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Languages</p>
                          <p className="font-medium">{screeningDetails.githubAnalysis.mainLanguages?.join(', ') || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Activity</p>
                          <p className="font-medium">{screeningDetails.githubAnalysis.activity ?? 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {screeningDetails.llmFeedback && (
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground mb-2">Feedback</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{screeningDetails.llmFeedback}</p>
                    </div>
                  )}

                  {(screeningDetails.strengths?.length ?? 0) > 0 || (screeningDetails.matchedPreferredSkills?.length ?? 0) > 0 ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Matched Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {screeningDetails.strengths?.map((s) => (
                          <Badge key={s} variant="success" className="text-xs bg-green-50 text-green-700 border-green-200">{s}</Badge>
                        ))}
                        {screeningDetails.matchedPreferredSkills?.map((s) => (
                          <Badge key={s} variant="default" className="text-xs bg-amber-50 text-amber-700 border-amber-200">{s} *</Badge>
                        ))}
                      </div>
                      {screeningDetails.matchedPreferredSkills && screeningDetails.matchedPreferredSkills.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">* Preferred skills</p>
                      )}
                    </div>
                  ) : null}

                  {screeningDetails.skillGaps && screeningDetails.skillGaps.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Areas for Growth</p>
                      <div className="flex flex-wrap gap-1.5">
                        {screeningDetails.skillGaps.map((g) => (
                          <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(application.status === ApplicationStatus.SCREENING_PASSED || application.status === ApplicationStatus.SCREENING_FAILED) && screeningDetails && (
          <Card className={application.status === ApplicationStatus.SCREENING_PASSED ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${application.status === ApplicationStatus.SCREENING_PASSED ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {application.status === ApplicationStatus.SCREENING_PASSED ? (
                  <CheckCircle2 className="w-6 h-6 text-success" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${application.status === ApplicationStatus.SCREENING_PASSED ? 'text-success' : 'text-destructive'}`}>
                  {application.status === ApplicationStatus.SCREENING_PASSED ? 'Screening Passed!' : 'Screening Did Not Pass'}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {application.status === ApplicationStatus.SCREENING_PASSED
                    ? 'Your CV matched the job requirements. You can now schedule your technical assessment.'
                    : 'Your CV did not meet the minimum score threshold for this position.'}
                </p>
              </div>
              {screeningDetails.overallScore !== undefined && (
                <div className="text-center flex-shrink-0">
                  <p className={`text-3xl font-bold ${application.status === ApplicationStatus.SCREENING_PASSED ? 'text-success' : 'text-destructive'}`}>
                    {screeningDetails.overallScore}
                  </p>
                  <p className="text-xs text-muted-foreground">AI Score</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(application.status === ApplicationStatus.SCREENING_PASSED || application.status === ApplicationStatus.SCHEDULED) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Technical Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {test ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={TEST_STATUS_VARIANT[test.status]}>
                            {test.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {test.totalTime} minutes
                          </span>
                        </div>
                        {test.scheduledAt && (
                          <span className="text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {new Date(test.scheduledAt).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {test.status === TestStatus.READY && (
                        <div className="flex gap-3">
                          <Button className="flex-1">
                            <Download className="w-4 h-4 mr-2" />
                            Download Electron App
                          </Button>
                          <Button variant="outline" className="flex-1">
                            <Play className="w-4 h-4 mr-2" />
                            Start Test
                          </Button>
                        </div>
                      )}
                      {test.status === TestStatus.IN_PROGRESS && (
                        <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                          <p className="text-sm font-medium text-warning">Test in progress</p>
                          <p className="text-xs text-muted-foreground mt-1">You can resume from where you left off.</p>
                          <Button size="sm" className="mt-3">
                            <Play className="w-4 h-4 mr-2" />
                            Resume Test
                          </Button>
                        </div>
                      )}
                      {test.status === TestStatus.SUBMITTED && (
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                          <p className="text-sm font-medium">Test submitted</p>
                          <p className="text-xs text-muted-foreground mt-1">Results will be reviewed by the hiring team.</p>
                        </div>
                      )}
                      {test.status === TestStatus.GRADED && (
                        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                          <Star className="w-8 h-8 text-success mx-auto mb-2" />
                          <p className="text-sm font-medium">Results available</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Congratulations on passing the screening! Schedule your technical assessment below.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Date</label>
                          <Input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Time</label>
                          <Input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button onClick={handleSchedule} isLoading={scheduleLoading} className="w-full">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Test
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {application.status === ApplicationStatus.OFFERED && (
              <Card className="border-success/30 bg-success/5">
                <CardContent className="pt-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                    <Star className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-xl font-bold text-success">Offer Received!</h3>
                  <p className="text-sm text-muted-foreground">
                    Congratulations! The hiring team loved your profile. Check your email for the official offer details.
                  </p>
                  <Button className="bg-success hover:bg-success/90">
                    View Offer Details
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {job?.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{job.location}</span>
                  </div>
                )}
                {job?.experienceLevel && (
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="capitalize">{job.experienceLevel.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {job?.salary && (job.salary.min || job.salary.max) && (
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      {job.salary.currency || '$'}{job.salary.min && `${job.salary.min.toLocaleString()}`}
                      {job.salary.min && job.salary.max && ' - '}
                      {job.salary.max && `${job.salary.max.toLocaleString()}`}
                    </span>
                  </div>
                )}
                {job?.requiredSkills && job.requiredSkills.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.requiredSkills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {candidate?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{candidate.email}</span>
                  </div>
                )}
                {candidate?.githubUrl && (
                  <div className="flex items-center gap-3">
                    <Github className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={candidate.githubUrl.startsWith('http') ? candidate.githubUrl : `https://github.com/${candidate.githubUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate flex items-center gap-1"
                    >
                      {candidate.githubUrl}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}
                {candidate?.experience !== undefined && (
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{candidate.experience} years experience</span>
                  </div>
                )}
                {candidate?.skills && candidate.skills.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-2">Your Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {candidate?.cvUrl && (
                  <div className="pt-3 border-t">
                    <a
                      href={candidate.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      View My CV
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
