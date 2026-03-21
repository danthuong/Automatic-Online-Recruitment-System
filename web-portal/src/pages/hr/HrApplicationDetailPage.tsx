import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, FileText, Github, Star, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { HrLayout } from '@/components/hr/HrLayout'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { ApplicationStatusBadge } from '@/components/hr/ApplicationStatusBadge'
import { hrService, type CandidateProfile } from '@/services/hrService'
import type { ApplicationResponse } from '@/types/job'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'screening', label: 'Screening' },
  { value: 'screening_passed', label: 'Screening Passed' },
  { value: 'screening_failed', label: 'Screening Failed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'test_completed', label: 'Test Completed' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Rejected' },
]

export function HrApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<ApplicationResponse | null>(null)
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [screening, setScreening] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [feedback, setFeedback] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      try {
        const appRes = await hrService.getApplication(id)
        setApp(appRes)
        setFeedback(appRes.screeningFeedback || '')
        setNotes(appRes.hrNotes || '')
        if (appRes.candidateId) {
          try {
            const cRes = await hrService.getCandidateProfile(appRes.candidateId)
            setCandidate(cRes)
          } catch {
            // candidate profile may not exist
          }
        }
      } catch {
        navigate('/hr/applications')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, navigate])

  const handleScreen = async (decision: 'pass' | 'fail') => {
    if (!id) return
    setError('')
    setScreening(true)
    try {
      const updated = await hrService.screenApplication(id, {
        decision,
        screeningFeedback: feedback || undefined,
        hrNotes: notes || undefined,
      })
      setApp(updated)
      setSuccess(decision === 'pass' ? 'Candidate passed screening' : 'Candidate failed screening')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to screen application'
      setError(msg)
    } finally {
      setScreening(false)
    }
  }

  const handleStatusUpdate = async (status: string) => {
    if (!id) return
    setError('')
    setUpdating(true)
    try {
      const updated = await hrService.updateApplicationStatus(id, {
        status,
        hrNotes: notes || undefined,
        cvScore: app?.cvScore,
        screeningFeedback: feedback || undefined,
      })
      setApp(updated)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to update status'
      setError(msg)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <HrLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </HrLayout>
    )
  }

  if (!app) return null

  return (
    <HrLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/hr/applications')}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {app.candidate?.firstName} {app.candidate?.lastName}
            </h1>
            <p className="text-muted-foreground">
              Application for{' '}
              <Link to={`/hr/jobs/${app.job?.id}`} className="text-primary hover:underline">
                {app.job?.title}
              </Link>
              {app.job?.company && ` at ${app.job.company.name}`}
            </p>
          </div>
          <ApplicationStatusBadge status={app.status} />
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}
        {success && <Alert>{success}</Alert>}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Candidate Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h2 className="font-semibold">Candidate Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{app.candidate?.email}</p>
                </div>
                {candidate?.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{candidate.phone}</p>
                  </div>
                )}
                {candidate?.experience !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Experience</p>
                    <p className="text-sm font-medium">{candidate.experience} years</p>
                  </div>
                )}
                {candidate?.education && (
                  <div>
                    <p className="text-xs text-muted-foreground">Education</p>
                    <p className="text-sm font-medium">{candidate.education}</p>
                  </div>
                )}
                {candidate?.wowScore !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">WOW Score</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-bold text-amber-600">{candidate.wowScore}</span>
                    </div>
                  </div>
                )}
              </div>

              {candidate?.skills && candidate.skills.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {candidate?.githubUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">GitHub</p>
                  <a
                    href={candidate.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Github className="w-4 h-4" />
                    {candidate.githubUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {candidate?.cvUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">CV / Resume</p>
                  <a
                    href={candidate.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    View CV
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Screening Panel */}
            {(app.status === 'pending' || app.status === 'screening') && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <h2 className="font-semibold">Screening Decision</h2>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Feedback (optional)</label>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Add screening feedback..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">HR Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Internal notes..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleScreen('pass')}
                    disabled={screening}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {screening ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Pass Screening
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleScreen('fail')}
                    disabled={screening}
                  >
                    {screening ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Fail Screening
                  </Button>
                </div>
              </div>
            )}

            {/* Screening Results */}
            {(app.status === 'screening_passed' || app.status === 'screening_failed') && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <h2 className="font-semibold">Screening Result</h2>
                {app.screeningFeedback && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Feedback</p>
                    <p className="text-sm whitespace-pre-wrap">{app.screeningFeedback}</p>
                  </div>
                )}
                {app.hrNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">HR Notes</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{app.hrNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold">Application Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied</span>
                  <span>{new Date(app.appliedAt).toLocaleDateString()}</span>
                </div>
                {app.cvScore !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CV Score</span>
                    <span className={`font-bold ${
                      app.cvScore >= 80 ? 'text-emerald-600' :
                      app.cvScore >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>{app.cvScore}%</span>
                  </div>
                )}
                {app.screeningDetails && (
                  <>
                    {app.screeningDetails.skillMatchScore !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Skill Match</span>
                        <span>{app.screeningDetails.skillMatchScore}%</span>
                      </div>
                    )}
                    {app.screeningDetails.experienceMatchScore !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Experience Match</span>
                        <span>{app.screeningDetails.experienceMatchScore}%</span>
                      </div>
                    )}
                  </>
                )}
                {app.screeningDetails?.strengths && app.screeningDetails.strengths.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Strengths</p>
                    <div className="flex flex-wrap gap-1">
                      {app.screeningDetails.strengths.map(s => (
                        <span key={s} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {app.screeningDetails?.skillGaps && app.screeningDetails.skillGaps.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Skill Gaps</p>
                    <div className="flex flex-wrap gap-1">
                      {app.screeningDetails.skillGaps.map(s => (
                        <span key={s} className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Update */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <h3 className="font-semibold">Update Status</h3>
              <select
                value={app.status}
                onChange={e => handleStatusUpdate(e.target.value)}
                disabled={updating}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {app.hrNotes !== undefined && (
                <div>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add notes..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate(app.status)}
                disabled={updating}
                className="w-full"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </HrLayout>
  )
}
