import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from '@/components/ui/tag-input'
import { Spinner } from '@/components/ui/spinner'
import { jobService } from '@/services/hrService'
import type { CreateJobPayload } from '@/types/hr'
import { ExperienceLevel, JobType, JobStatus } from '@/types/index'

const experienceOptions = [
  { value: '', label: 'Any Level' },
  { value: ExperienceLevel.INTERN, label: 'Intern' },
  { value: ExperienceLevel.JUNIOR, label: 'Junior' },
  { value: ExperienceLevel.MID, label: 'Mid-Level' },
  { value: ExperienceLevel.SENIOR, label: 'Senior' },
  { value: ExperienceLevel.LEAD, label: 'Lead' },
  { value: ExperienceLevel.MANAGER, label: 'Manager' },
]

const jobTypeOptions = [
  { value: '', label: 'Any Type' },
  { value: JobType.FULL_TIME, label: 'Full-time' },
  { value: JobType.PART_TIME, label: 'Part-time' },
  { value: JobType.CONTRACT, label: 'Contract' },
  { value: JobType.INTERNSHIP, label: 'Internship' },
]

const locationOptions = [
  { value: '', label: 'Select location' },
  { value: 'New York', label: 'New York' },
  { value: 'San Francisco', label: 'San Francisco' },
  { value: 'London', label: 'London' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Berlin', label: 'Berlin' },
  { value: 'Remote', label: 'Remote' },
]

export function CreateJobPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [fetchingJob, setFetchingJob] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState<CreateJobPayload>({
    title: '',
    description: '',
    summary: '',
    requiredSkills: [],
    preferredSkills: [],
    experienceLevel: '',
    jobType: '',
    salary: { min: undefined, max: undefined, currency: 'USD', isNegotiable: false },
    location: '',
    remote: false,
    hiringCount: 1,
    testConfig: {
      totalTime: 60,
      codeQuestionCount: 2,
      essayQuestionCount: 2,
      mcqQuestionCount: 3,
      passingScore: 60,
    },
  })

  useEffect(() => {
    if (!isEditing) return
    setFetchingJob(true)
    jobService.getById(id!)
      .then((job) => {
        setForm({
          title: job.title || '',
          description: job.description || '',
          summary: job.summary || '',
          requiredSkills: job.requiredSkills || [],
          preferredSkills: job.preferredSkills || [],
          experienceLevel: job.experienceLevel || '',
          jobType: job.jobType || '',
          salary: job.salary || { currency: 'USD', isNegotiable: false },
          location: job.location || '',
          remote: job.remote || false,
          hiringCount: job.hiringCount || 1,
          testConfig: job.testConfig || {
            totalTime: 60,
            codeQuestionCount: 2,
            essayQuestionCount: 2,
            mcqQuestionCount: 3,
            passingScore: 60,
          },
        })
      })
      .catch(() => {
        toast.error('Failed to load job')
        navigate('/hr/jobs')
      })
      .finally(() => setFetchingJob(false))
  }, [id, isEditing, navigate])

  const updateField = <K extends keyof CreateJobPayload>(key: K, value: CreateJobPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateSalary = (key: string, value: number | boolean | string) => {
    setForm((prev) => ({
      ...prev,
      salary: { ...prev.salary!, [key]: value },
    }))
  }

  const updateTestConfig = (key: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      testConfig: { ...prev.testConfig!, [key]: value },
    }))
  }

  const handleSubmit = async (publish: boolean) => {
    if (!form.title.trim() || !form.description.trim() || form.requiredSkills.length === 0) {
      toast.error('Please fill in required fields: title, description, and at least one skill')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        status: publish ? JobStatus.ACTIVE : JobStatus.DRAFT,
        experienceLevel: form.experienceLevel || undefined,
        jobType: form.jobType || undefined,
        location: form.location || undefined,
      }

      if (isEditing) {
        await jobService.update(id!, payload)
        toast.success(publish ? 'Job published!' : 'Job saved as draft')
      } else {
        await jobService.create(payload)
        toast.success(publish ? 'Job created and published!' : 'Job created as draft')
      }
      navigate('/hr/jobs')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save job'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (fetchingJob) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Job Posting' : 'Create Job Posting'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update your job posting details' : 'Fill in the details to create a new job posting'}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Job title, description, and summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Title *</label>
                <Input
                  placeholder="e.g. Senior Frontend Engineer"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Job Description *</label>
                <Textarea
                  placeholder="Describe the role, responsibilities, and requirements..."
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={8}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Summary</label>
                <Textarea
                  placeholder="A brief summary of the role (shown in job cards)..."
                  value={form.summary || ''}
                  onChange={(e) => updateField('summary', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills & Requirements</CardTitle>
              <CardDescription>Required and preferred skills for the role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TagInput
                label="Required Skills *"
                value={form.requiredSkills}
                onChange={(tags) => updateField('requiredSkills', tags)}
                placeholder="Type a skill and press Enter"
                maxTags={20}
              />
              <TagInput
                label="Preferred Skills"
                value={form.preferredSkills || []}
                onChange={(tags) => updateField('preferredSkills', tags)}
                placeholder="Type a skill and press Enter"
                maxTags={15}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Experience Level</label>
                  <select
                    value={form.experienceLevel || ''}
                    onChange={(e) => updateField('experienceLevel', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {experienceOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Type</label>
                  <select
                    value={form.jobType || ''}
                    onChange={(e) => updateField('jobType', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {jobTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location & Compensation</CardTitle>
              <CardDescription>Where the role is based and salary range</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <select
                    value={form.location || ''}
                    onChange={(e) => updateField('location', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {locationOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hiring Count</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.hiringCount}
                    onChange={(e) => updateField('hiringCount', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="remote"
                  checked={form.remote || false}
                  onChange={(e) => updateField('remote', e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="remote" className="text-sm font-medium">Remote Friendly</label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Salary</label>
                  <Input
                    type="number"
                    placeholder="e.g. 80000"
                    value={form.salary?.min || ''}
                    onChange={(e) => updateSalary('min', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Salary</label>
                  <Input
                    type="number"
                    placeholder="e.g. 120000"
                    value={form.salary?.max || ''}
                    onChange={(e) => updateSalary('max', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={form.salary?.currency || 'USD'}
                    onChange={(e) => updateSalary('currency', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="VND">VND</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="negotiable"
                  checked={form.salary?.isNegotiable || false}
                  onChange={(e) => updateSalary('isNegotiable', e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="negotiable" className="text-sm font-medium">Salary negotiable</label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Assessment Configuration
              </CardTitle>
              <CardDescription>Configure the coding test parameters for candidates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Time (minutes)</label>
                  <Input
                    type="number"
                    min={15}
                    max={300}
                    value={form.testConfig?.totalTime || 60}
                    onChange={(e) => updateTestConfig('totalTime', parseInt(e.target.value) || 60)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Passing Score (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.testConfig?.passingScore || 60}
                    onChange={(e) => updateTestConfig('passingScore', parseInt(e.target.value) || 60)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code Questions</label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={form.testConfig?.codeQuestionCount || 0}
                    onChange={(e) => updateTestConfig('codeQuestionCount', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Essay Questions</label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={form.testConfig?.essayQuestionCount || 0}
                    onChange={(e) => updateTestConfig('essayQuestionCount', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">MCQ Questions</label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={form.testConfig?.mcqQuestionCount || 0}
                    onChange={(e) => updateTestConfig('mcqQuestionCount', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3 pb-8">
            <Button variant="outline" onClick={() => navigate('/hr/jobs')} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleSubmit(false)} isLoading={submitting}>
              Save as Draft
            </Button>
            <Button onClick={() => handleSubmit(true)} isLoading={submitting}>
              Publish Job
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
