import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Mail, Github, FileText, Star,
  CheckCircle2, XCircle, TrendingUp, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { applicationService } from '@/services/hrService'
import type { ApplicationResponse } from '@/types/job'
import { ApplicationStatus } from '@/types/index'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
  [ApplicationStatus.PENDING]: { label: 'Applied', variant: 'secondary' },
  [ApplicationStatus.SCREENING]: { label: 'Screening', variant: 'warning' },
  [ApplicationStatus.SCREENING_PASSED]: { label: 'Passed', variant: 'success' },
  [ApplicationStatus.SCREENING_FAILED]: { label: 'Rejected', variant: 'destructive' },
  [ApplicationStatus.SCHEDULED]: { label: 'Scheduled', variant: 'default' },
  [ApplicationStatus.TEST_COMPLETED]: { label: 'Test Done', variant: 'success' },
  [ApplicationStatus.OFFERED]: { label: 'Offered', variant: 'success' },
  [ApplicationStatus.REJECTED]: { label: 'Rejected', variant: 'destructive' },
}

export function ApplicationReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [application, setApplication] = useState<ApplicationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [screeningFeedback, setScreeningFeedback] = useState('')
  const [cvScore, setCvScore] = useState('')
  const [hrNotes, setHrNotes] = useState('')
  const [screening, setScreening] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    applicationService.getById(id)
      .then(setApplication)
      .catch(() => {
        toast.error('Failed to load application')
        navigate('/hr/jobs')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleScreen = async (decision: 'pass' | 'fail') => {
    if (!id) return
    setScreening(true)
    try {
      const result = await applicationService.screen(id, {
        decision,
        cvScore: cvScore ? parseInt(cvScore) : undefined,
        screeningFeedback: screeningFeedback || undefined,
        hrNotes: hrNotes || undefined,
      })
      setApplication(result)
      toast.success(decision === 'pass' ? 'Candidate passed screening!' : 'Candidate rejected')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to screen application'
      toast.error(message)
    } finally {
      setScreening(false)
    }
  }

  const handleStatusChange = async (status: ApplicationStatus) => {
    if (!id) return
    try {
      const result = await applicationService.updateStatus(id, { status, hrNotes })
      setApplication(result)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
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
  const statusCfg = STATUS_CONFIG[application.status] || { label: application.status, variant: 'secondary' as const }
  const screeningDetails = application.screeningDetails

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold flex-shrink-0">
              {candidate?.user?.firstName?.[0]}{candidate?.user?.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {candidate?.user?.firstName} {candidate?.user?.lastName}
              </h1>
              <p className="text-muted-foreground">{application.job?.title}</p>
              <Badge variant={statusCfg.variant} className="mt-1">{statusCfg.label}</Badge>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {application.status === ApplicationStatus.SCHEDULED && (
              <Button onClick={() => handleStatusChange(ApplicationStatus.TEST_COMPLETED)} variant="outline" size="sm">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Test Done
              </Button>
            )}
            {application.status === ApplicationStatus.TEST_COMPLETED && (
              <>
                <Button onClick={() => handleStatusChange(ApplicationStatus.OFFERED)} size="sm" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Make Offer
                </Button>
                <Button onClick={() => handleStatusChange(ApplicationStatus.REJECTED)} variant="destructive" size="sm">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="text-3xl font-bold text-blue-600">{screeningDetails.skillMatchScore ?? '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Skill Match</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-100">
                      <p className="text-3xl font-bold text-purple-600">{screeningDetails.experienceMatchScore ?? '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Experience</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-3xl font-bold text-primary">{screeningDetails.overallScore ?? '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
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
                          <p className="font-medium">
                            {screeningDetails.githubAnalysis.mainLanguages?.join(', ') || 'N/A'}
                          </p>
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
                      <p className="text-xs text-muted-foreground mb-2">LLM Feedback</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{screeningDetails.llmFeedback}</p>
                    </div>
                  )}

                  {screeningDetails.strengths && screeningDetails.strengths.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Strengths</p>
                      <div className="flex flex-wrap gap-1.5">
                        {screeningDetails.strengths.map((s) => (
                          <Badge key={s} variant="success" className="text-xs bg-green-50 text-green-700 border-green-200">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {screeningDetails.skillGaps && screeningDetails.skillGaps.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Skill Gaps</p>
                      <div className="flex flex-wrap gap-1.5">
                        {screeningDetails.skillGaps.map((g) => (
                          <Badge key={g} variant="destructive" className="text-xs">{g}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(application.status === ApplicationStatus.PENDING || application.status === ApplicationStatus.SCREENING) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Review & Decision</CardTitle>
                  <CardDescription>Provide feedback and make a decision</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CV Score (0-100)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="e.g. 85"
                      value={cvScore}
                      onChange={(e) => setCvScore(e.target.value)}
                    />
                  </div>
                  <Textarea
                    label="Screening Feedback"
                    placeholder="Provide feedback on the candidate's application..."
                    value={screeningFeedback}
                    onChange={(e) => setScreeningFeedback(e.target.value)}
                    rows={4}
                  />
                  <Textarea
                    label="HR Notes (Internal)"
                    placeholder="Private notes about this candidate..."
                    value={hrNotes}
                    onChange={(e) => setHrNotes(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleScreen('pass')}
                      isLoading={screening}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Pass Screening
                    </Button>
                    <Button
                      onClick={() => handleScreen('fail')}
                      isLoading={screening}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-5">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Candidate Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
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
                        href={`https://github.com/${candidate.githubUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate flex items-center gap-1"
                      >
                        {candidate.githubUrl}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                  {candidate?.phone && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                  {candidate?.experience !== undefined && (
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span>{candidate.experience} years experience</span>
                    </div>
                  )}
                </div>

                {candidate?.skills && candidate.skills.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {candidate?.cvUrl && (
                  <div className="pt-4 border-t">
                    <a
                      href={candidate.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      View CV
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div className="pt-4 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Applied</span>
                    <span>{new Date(application.appliedAt).toLocaleDateString()}</span>
                  </div>
                  {application.screenedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Screened</span>
                      <span>{new Date(application.screenedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {application.cvScore !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CV Score</span>
                      <span className="font-medium">{application.cvScore}</span>
                    </div>
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
