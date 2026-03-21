import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, User, Eye, EyeOff, Github, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FileUpload } from '@/components/ui/file-upload'
import { ImageUpload } from '@/components/ui/image-upload'
import { useAuth } from '@/hooks/useAuth'
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'
import { cn } from '@/lib/utils'

export function RegisterPage() {
  const { register: registerUser, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'candidate',
      githubUrl: '',
      cvFileId: '',
      faceImageFileId: '',
    },
  })

  const role = watch('role')
  const isCandidate = role === 'candidate'

  const onSubmit = async (data: RegisterFormData) => {
    const payload = {
      ...data,
      githubUrl: isCandidate ? data.githubUrl : undefined,
      cvFileId: isCandidate ? data.cvFileId : undefined,
      faceImageFileId: isCandidate ? data.faceImageFileId : undefined,
    }
    await registerUser(payload)
  }

  return (
    <Card className="border-0 shadow-none lg:border lg:shadow-soft p-0">
      <CardHeader className="px-0 lg:px-6 space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Join LotusHack to start your journey
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 lg:px-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                {...register('firstName')}
                label="First name"
                placeholder="John"
                error={errors.firstName?.message}
                leftIcon={<User className="h-4 w-4" />}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Input
                {...register('lastName')}
                label="Last name"
                placeholder="Doe"
                error={errors.lastName?.message}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Input
              {...register('email')}
              type="email"
              label="Email address"
              placeholder="you@example.com"
              error={errors.email?.message}
              leftIcon={<Mail className="h-4 w-4" />}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Create account as</label>
            <select
              {...register('role')}
              className={cn(
                'flex h-12 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'transition-all duration-200',
                errors.role && 'border-destructive'
              )}
            >
              <option value="candidate">Candidate</option>
              <option value="hr">HR / Recruiter</option>
            </select>
            {errors.role && (
              <p className="text-xs text-destructive mt-1">{errors.role.message}</p>
            )}
          </div>

          {isCandidate && (
            <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Info className="w-4 h-4" />
                Candidate Information (Required)
              </div>

              <div className="space-y-2">
                <Input
                  {...register('githubUrl')}
                  label="GitHub Username"
                  placeholder="e.g. octocat"
                  error={errors.githubUrl?.message}
                  leftIcon={<Github className="h-4 w-4" />}
                />
              </div>

              <FileUpload
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                maxSize={10 * 1024 * 1024}
                label="CV / Resume"
                description="PDF, DOC, DOCX — max 10MB"
                onUpload={(fileId) => setValue('cvFileId', fileId)}
              />
              {errors.cvFileId && (
                <p className="text-xs text-destructive">{errors.cvFileId.message}</p>
              )}

              <ImageUpload
                label="Face Photo"
                description="JPG, PNG — max 5MB — for identity verification"
                onUpload={(fileId) => setValue('faceImageFileId', fileId)}
              />
              {errors.faceImageFileId && (
                <p className="text-xs text-destructive">{errors.faceImageFileId.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Create a strong password"
                error={errors.password?.message}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Min 8 chars with uppercase, lowercase, and number
              </p>
            </div>
            <div className="space-y-2">
              <Input
                {...register('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                label="Confirm password"
                placeholder="Confirm your password"
                error={errors.confirmPassword?.message}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="terms" required />
            <label htmlFor="terms" className="text-sm font-medium leading-none cursor-pointer">
              I agree to the{' '}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
            disabled={
              isLoading ||
              (isCandidate && (!watch('cvFileId') || !watch('faceImageFileId')))
            }
          >
            Create account
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
