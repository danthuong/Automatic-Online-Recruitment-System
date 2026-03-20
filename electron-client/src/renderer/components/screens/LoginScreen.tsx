import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/renderer/components/ui/button'
import { Input } from '@/renderer/components/ui/input'
import { ThemeToggle } from '@/renderer/components/ui/theme-toggle'
import { IntroLogo } from '@/renderer/components/ui/IntroLogo'
import { useExamStore } from '@/renderer/store/examStore'
import { cn } from '@/renderer/lib/utils'
import { 
  Shield, 
  Lock, 
  User, 
  Terminal,
  CheckCircle,
} from 'lucide-react'
import { useTheme } from '@/renderer/hooks/useTheme'

// Asian-inspired animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 0.61, 0.36, 1] as const, // Fabric easing
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.98, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 0.61, 0.36, 1] as const, // Fabric easing
    },
  },
}

export function LoginScreen() {
  const [testId, setTestId] = useState('')
  const [candidateId, setCandidateId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setLogin, setCandidateName } = useExamStore()
  const { theme } = useTheme()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      if (!testId.trim() || !candidateId.trim()) {
        throw new Error('Please enter both Test ID and Candidate ID')
      }

      setCandidateName(`Candidate ${candidateId}`)
      setLogin(testId.trim(), candidateId.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IntroLogo size={36} />
          <span className={cn(
            "text-lg font-semibold",
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            HCMUT Recruitment
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          {/* Login Card */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              "rounded-xl border p-8",
              theme === 'dark' 
                ? 'bg-card border-border' 
                : 'bg-white border-slate-200'
            )}
            style={{
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
            }}
          >
            {/* Logo & Title */}
            <motion.div variants={itemVariants} className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <IntroLogo size={80} />
              </div>
              <h1 className={cn(
                "text-2xl font-semibold",
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                Welcome Back
              </h1>
              <p className={cn(
                "mt-2 text-sm",
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                Enter your credentials to begin your assessment
              </p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Test ID */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className={cn(
                  "text-sm font-medium flex items-center gap-2",
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                )}>
                  <Terminal className="w-4 h-4 text-primary" />
                  Test ID
                </label>
                <Input
                  type="text"
                  value={testId}
                  onChange={(e) => setTestId(e.target.value)}
                  placeholder="Enter your test ID"
                  disabled={isLoading}
                  className="h-11"
                />
              </motion.div>

              {/* Candidate ID */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className={cn(
                  "text-sm font-medium flex items-center gap-2",
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                )}>
                  <User className="w-4 h-4 text-primary" />
                  Candidate ID
                </label>
                <Input
                  type="text"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  placeholder="Enter your candidate ID"
                  disabled={isLoading}
                  className="h-11"
                />
              </motion.div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className={cn(
                    "p-4 rounded-lg text-sm flex items-center gap-3",
                    theme === 'dark'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  )}
                >
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.div variants={itemVariants}>
              <Button
                type="submit"
                className="w-full h-11 text-sm font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Begin Assessment'
                )}
              </Button>
              </motion.div>
            </form>

            {/* Security Info */}
            <motion.div variants={itemVariants} className={cn(
              "mt-8 pt-6 border-t space-y-4",
              theme === 'dark' ? 'border-border' : 'border-slate-200'
            )}>
              <div className={cn(
                "flex items-center justify-center gap-6 text-xs",
                theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
              )}>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Encrypted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Proctored</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Secure</span>
                </div>
              </div>
              
              <p className={cn(
                "text-center text-xs",
                theme === 'dark' ? 'text-slate-600' : 'text-slate-500'
              )}>
                By continuing, you agree to AI-powered proctoring during your assessment
              </p>
            </motion.div>
          </motion.div>

          {/* Footer Info */}
          <motion.p 
            variants={itemVariants}
            className={cn(
              "text-center text-xs mt-6",
              theme === 'dark' ? 'text-slate-600' : 'text-slate-500'
            )}
          >
            Ho Chi Minh City University of Technology
          </motion.p>
        </motion.div>
      </main>
    </div>
  )
}
