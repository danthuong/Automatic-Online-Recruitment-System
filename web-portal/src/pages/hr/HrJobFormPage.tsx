import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { HrLayout } from '@/components/hr/HrLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { hrService } from '@/services/hrService'
import type { JobFormData } from '@/types/hr'

const EXPERIENCE_LEVELS = ['intern', 'junior', 'mid', 'senior', 'lead', 'manager']
const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship']

export function HrJobFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')

  const [form, setForm] = useState<JobFormData>({
    title: '',
    description: '',
    summary: '',
    requiredSkills: [],
    preferredSkills: [],
    experienceLevel: 'mid',
    jobType: 'full-time',
    location: '',
    remote: false,
    hiringCount: 1,
    salary: { min: undefined, max: undefined, currency: 'USD', isNegotiable: false },
    testConfig: { totalTime: 60, codeQuestionCount: 2, essayQuestionCount: 2, mcqQuestionCount: 3, passingScore: 70 },
  })

  const [skillInput, setSkillInput] = useState('')
  const [prefSkillInput, setPrefSkillInput] = useState('')

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      try {
        const job = await hrService.getJob(id)
        setForm({
          title: job.title,
          description: job.description,
          summary: job.summary || '',
          requiredSkills: job.requiredSkills || [],
          preferredSkills: job.preferredSkills || [],
          experienceLevel: job.experienceLevel || 'mid',
          jobType: job.jobType || 'full-time',
          location: job.location || '',
          remote: job.remote || false,
          hiringCount: job.hiringCount || 1,
          salary: job.salary || { min: undefined, max: undefined, currency: 'USD', isNegotiable: false },
          status: job.status,
          testConfig: job.testConfig || { totalTime: 60, codeQuestionCount: 2, essayQuestionCount: 2, mcqQuestionCount: 3, passingScore: 70 },
        })
      } catch {
        navigate('/hr/jobs')
      } finally {
        setFetching(false)
      }
    }
    fetch()
  }, [id, navigate])

  const addSkill = (list: 'required' | 'preferred', value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const key = list === 'required' ? 'requiredSkills' : 'preferredSkills'
    if (!form[key]?.includes(trimmed)) {
      setForm(prev => ({ ...prev, [key]: [...(prev[key] || []), trimmed] }))
    }
    setSkillInput('')
    setPrefSkillInput('')
  }

  const removeSkill = (list: 'required' | 'preferred', skill: string) => {
    const key = list === 'required' ? 'requiredSkills' : 'preferredSkills'
    setForm(prev => ({ ...prev, [key]: (prev[key] || []).filter(s => s !== skill) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required')
      return
    }
    if ((form.requiredSkills || []).length === 0) {
      setError('At least one required skill is needed')
      return
    }

    setLoading(true)
    try {
      const data = { ...form }
      if (data.status === 'active' && (!data.requiredSkills || data.requiredSkills.length === 0)) {
        data.status = 'draft'
      }

      if (isEdit && id) {
        await hrService.updateJob(id, data as Record<string, unknown>)
        navigate(`/hr/jobs/${id}`)
      } else {
        const created = await hrService.createJob(data as Record<string, unknown>)
        navigate(`/hr/jobs/${created.id}`)
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to save job'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <HrLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </HrLayout>
    )
  }

  return (
    <HrLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(isEdit ? `/hr/jobs/${id}` : '/hr/jobs')}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Job' : 'Create New Job'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-semibold">Basic Information</h2>

            <Input
              label="Job Title"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Senior Frontend Developer"
              required
            />

            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role, responsibilities, and requirements..."
                rows={5}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                required
              />
            </div>

            <Input
              label="Summary"
              value={form.summary || ''}
              onChange={e => setForm(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Short summary (optional)"
            />
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-semibold">Skills</h2>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Required Skills</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(form.requiredSkills || []).map(skill => (
                  <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                    {skill}
                    <button type="button" onClick={() => removeSkill('required', skill)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill('required', skillInput) } }}
                  placeholder="Add required skill..."
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addSkill('required', skillInput)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Preferred Skills</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(form.preferredSkills || []).map(skill => (
                  <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent text-muted-foreground text-xs rounded-full">
                    {skill}
                    <button type="button" onClick={() => removeSkill('preferred', skill)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={prefSkillInput}
                  onChange={e => setPrefSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill('preferred', prefSkillInput) } }}
                  placeholder="Add preferred skill..."
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addSkill('preferred', prefSkillInput)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-semibold">Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Experience Level</label>
                <select
                  value={form.experienceLevel || ''}
                  onChange={e => setForm(prev => ({ ...prev, experienceLevel: e.target.value as JobFormData['experienceLevel'] }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {EXPERIENCE_LEVELS.map(l => (
                    <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Job Type</label>
                <select
                  value={form.jobType || ''}
                  onChange={e => setForm(prev => ({ ...prev, jobType: e.target.value as JobFormData['jobType'] }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {JOB_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Location</label>
                <input
                  value={form.location || ''}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Ho Chi Minh City"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Hiring Count</label>
                <input
                  type="number"
                  min={1}
                  value={form.hiringCount || 1}
                  onChange={e => setForm(prev => ({ ...prev, hiringCount: parseInt(e.target.value, 10) || 1 }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  id="remote"
                  checked={form.remote || false}
                  onChange={e => setForm(prev => ({ ...prev, remote: e.target.checked }))}
                  className="w-4 h-4 rounded border-input"
                />
                <label htmlFor="remote" className="text-sm font-medium">Remote allowed</label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Salary Min (USD)</label>
                <input
                  type="number"
                  min={0}
                  value={form.salary?.min || ''}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    salary: { ...prev.salary, min: e.target.value ? parseInt(e.target.value, 10) : undefined }
                  }))}
                  placeholder="e.g. 2000"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Salary Max (USD)</label>
                <input
                  type="number"
                  min={0}
                  value={form.salary?.max || ''}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    salary: { ...prev.salary, max: e.target.value ? parseInt(e.target.value, 10) : undefined }
                  }))}
                  placeholder="e.g. 4000"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    salary: { ...prev.salary, isNegotiable: !(prev.salary?.isNegotiable) }
                  }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.salary?.isNegotiable
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-card text-muted-foreground'
                  }`}
                >
                  Negotiable
                </button>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-semibold">Test Configuration (Optional)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Total Time (min)</label>
                <input
                  type="number"
                  min={1}
                  value={form.testConfig?.totalTime || 60}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    testConfig: { ...prev.testConfig!, totalTime: parseInt(e.target.value, 10) || 60 }
                  }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Code Questions</label>
                <input
                  type="number"
                  min={0}
                  value={form.testConfig?.codeQuestionCount || 0}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    testConfig: { ...prev.testConfig!, codeQuestionCount: parseInt(e.target.value, 10) || 0 }
                  }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Essay Questions</label>
                <input
                  type="number"
                  min={0}
                  value={form.testConfig?.essayQuestionCount || 0}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    testConfig: { ...prev.testConfig!, essayQuestionCount: parseInt(e.target.value, 10) || 0 }
                  }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">MCQ Questions</label>
                <input
                  type="number"
                  min={0}
                  value={form.testConfig?.mcqQuestionCount || 0}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    testConfig: { ...prev.testConfig!, mcqQuestionCount: parseInt(e.target.value, 10) || 0 }
                  }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Passing Score (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.testConfig?.passingScore || 70}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    testConfig: { ...prev.testConfig!, passingScore: parseInt(e.target.value, 10) || 70 }
                  }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={loading}>
              {isEdit ? 'Save Changes' : 'Create Job'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEdit ? `/hr/jobs/${id}` : '/hr/jobs')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </HrLayout>
  )
}
