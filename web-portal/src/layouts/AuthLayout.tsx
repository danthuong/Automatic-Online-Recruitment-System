import { Link, useLocation } from 'react-router-dom'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-primary-foreground">
        <div>
          <div className="flex items-center gap-3">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.15" />
              <path
                d="M20 8L32 32H8L20 8Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <circle cx="20" cy="22" r="4" fill="currentColor" />
            </svg>
            <span className="text-2xl font-bold tracking-tight">LotusHack</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Smart Recruitment,<br />
            <span className="text-primary-foreground/80">Powered by AI</span>
          </h1>
          <p className="text-lg text-primary-foreground/70 max-w-md">
            Streamline your hiring process with automated screening, 
            AI-driven assessments, and intelligent candidate matching.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-primary-foreground/60">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>AI-Powered Candidate Screening</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-primary-foreground/60">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Secure Proctored Assessments</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-primary-foreground/60">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Real-time Analytics & Reporting</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg
                width="32"
                height="32"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="40" height="40" rx="10" fill="hsl(239 84% 67%)" fillOpacity="0.15" />
                <path
                  d="M20 8L32 32H8L20 8Z"
                  stroke="hsl(239 84% 67%)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="20" cy="22" r="4" fill="hsl(239 84% 67%)" />
              </svg>
              <span className="text-xl font-bold tracking-tight">LotusHack</span>
            </div>
          </div>

          {children}

          <div className="text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Don&apos;t have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:underline"
                >
                  Create one
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
