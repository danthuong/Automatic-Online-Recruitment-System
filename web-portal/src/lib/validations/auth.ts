import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const githubUsernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/

const baseFields = {
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: z.enum(['candidate', 'hr'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
}

const candidateFields = {
  githubUrl: z
    .string()
    .min(1, 'GitHub username is required')
    .max(39, 'GitHub username must be 39 characters or less')
    .regex(githubUsernameRegex, 'Invalid GitHub username format'),
  cvFileId: z.string().min(1, 'Please upload your CV'),
  faceImageFileId: z.string().min(1, 'Please upload a face photo'),
}

const hrFields = {
  githubUrl: z.string().optional(),
  cvFileId: z.string().optional(),
  faceImageFileId: z.string().optional(),
}

export const registerSchema = z
  .object({ ...baseFields, ...candidateFields, ...hrFields })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.role === 'candidate') {
      if (!data.githubUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GitHub username is required for candidates',
          path: ['githubUrl'],
        })
      }
      if (!data.cvFileId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please upload your CV',
          path: ['cvFileId'],
        })
      }
      if (!data.faceImageFileId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please upload a face photo',
          path: ['faceImageFileId'],
        })
      }
    }
  })

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
