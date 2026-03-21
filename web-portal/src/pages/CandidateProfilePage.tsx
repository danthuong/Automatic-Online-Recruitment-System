import { useState, useEffect } from 'react'
import { User, Github, Linkedin, Globe, FileText, Image, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/ui/tag-input'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/useAuth'
import { userService, type UpdateProfilePayload } from '@/services/userService'
import type { CandidateInfo } from '@/types/job'
import { cn } from '@/lib/utils'

export function CandidateProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<CandidateInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    education: '',
    linkedInUrl: '',
    portfolioUrl: '',
    skills: [] as string[],
    experience: 0,
  })

  useEffect(() => {
    setLoading(true)
    userService.getMyCandidateProfile()
      .then((p) => {
        setProfile(p)
        setForm({
          firstName: p.user?.firstName || '',
          lastName: p.user?.lastName || '',
          phone: p.phone || '',
          education: p.education || '',
          linkedInUrl: p.linkedInUrl || '',
          portfolioUrl: p.portfolioUrl || '',
          skills: p.skills || [],
          experience: p.experience || 0,
        })
      })
      .catch(() => {
        toast.error('Failed to load profile')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      const payload: UpdateProfilePayload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        education: form.education || undefined,
        linkedInUrl: form.linkedInUrl || undefined,
        portfolioUrl: form.portfolioUrl || undefined,
        skills: form.skills,
        experience: form.experience,
      }
      const updated = await userService.updateProfile(user.id, payload)
      setProfile(updated)
      toast.success('Profile updated successfully')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update profile'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal information and candidate profile
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Your account name and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Your first name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Your last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                type="tel"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Education</label>
              <Input
                value={form.education}
                onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))}
                placeholder="e.g. B.S. Computer Science, MIT"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Years of Experience</label>
              <Input
                type="number"
                min={0}
                max={50}
                value={form.experience}
                onChange={(e) => setForm((f) => ({ ...f, experience: parseInt(e.target.value) || 0 }))}
                placeholder="e.g. 5"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Professional Profile
            </CardTitle>
            <CardDescription>Your skills and online presence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Skills</label>
              <TagInput
                value={form.skills}
                onChange={(tags) => setForm((f) => ({ ...f, skills: tags }))}
                placeholder="Type a skill and press Enter"
                maxTags={20}
              />
              <p className="text-xs text-muted-foreground">
                Add up to 20 skills. These are used to match you with relevant job opportunities.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Github className="w-4 h-4" />
                GitHub URL
              </label>
              <Input
                value={profile?.githubUrl || ''}
                readOnly
                placeholder="GitHub profile (set at registration)"
              />
              <p className="text-xs text-muted-foreground">
                GitHub is linked at registration and cannot be changed here.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Linkedin className="w-4 h-4" />
                LinkedIn URL
              </label>
              <Input
                value={form.linkedInUrl}
                onChange={(e) => setForm((f) => ({ ...f, linkedInUrl: e.target.value }))}
                placeholder="https://linkedin.com/in/yourprofile"
                type="url"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Portfolio / Personal Website
              </label>
              <Input
                value={form.portfolioUrl}
                onChange={(e) => setForm((f) => ({ ...f, portfolioUrl: e.target.value }))}
                placeholder="https://yourportfolio.com"
                type="url"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents
            </CardTitle>
            <CardDescription>Your CV and profile photo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Resume / CV
              </label>
              <div className={cn(
                'flex items-center gap-3 p-3 rounded-lg border text-sm',
                profile?.cvUrl ? 'text-primary' : 'text-muted-foreground'
              )}>
                <FileText className="w-5 h-5 flex-shrink-0" />
                {profile?.cvUrl ? (
                  <a
                    href={profile.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex-1 truncate"
                  >
                    View your CV
                  </a>
                ) : (
                  <span className="flex-1">No CV uploaded</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a new CV in your registration flow to update this.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Image className="w-4 h-4" />
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                {profile?.faceImageUrl ? (
                  <img
                    src={profile.faceImageUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-xl object-cover border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center border">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">
                    Profile photo is set at registration. Upload a new one to update it.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {profile?.wowScore !== undefined && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                AI Profile Score
              </CardTitle>
              <CardDescription>Your profile completeness score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="3"
                      strokeDasharray={`${profile.wowScore}, 100`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {profile.wowScore}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {profile.wowScore >= 80 ? 'Excellent profile' :
                     profile.wowScore >= 60 ? 'Good profile' :
                     profile.wowScore >= 40 ? 'Average profile' :
                     'Incomplete profile'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Complete your profile to improve your score and visibility to employers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} isLoading={saving} size="lg" className="gap-2">
            {saving ? <Loader2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </main>
    </div>
  )
}
