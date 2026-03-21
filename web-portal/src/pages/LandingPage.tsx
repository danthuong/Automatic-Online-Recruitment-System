import { Link } from 'react-router-dom'
import { Search, FileText, Shield, BarChart3, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useState } from 'react'

export function LandingPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
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
                  stroke="hsl(239 84%/67%)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="20" cy="22" r="4" fill="hsl(239 84%/67%)" />
              </svg>
              <span className="text-xl font-bold tracking-tight">LotusHack</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="relative py-24 sm:py-32 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Find Your Dream Job<br />
              <span className="text-primary">Powered by AI</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Streamline your job search with intelligent matching, AI-powered screening,
              and secure proctored assessments. Connect with top companies worldwide.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs, skills, or companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <Link to="/jobs">
                <Button size="lg" className="h-12 px-8">
                  Search Jobs
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                5,000+ Active Jobs
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                200+ Companies
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                AI-Powered Matching
              </span>
            </div>
          </div>
        </section>

        <section className="py-16 border-t bg-card/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold">How It Works</h2>
              <p className="text-muted-foreground mt-2">Your path to getting hired in 4 simple steps</p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: '01',
                  icon: <FileText className="w-6 h-6" />,
                  title: 'Create Profile',
                  desc: 'Sign up and build your profile with your resume and skills',
                },
                {
                  step: '02',
                  icon: <Search className="w-6 h-6" />,
                  title: 'Browse Jobs',
                  desc: 'Explore thousands of job listings from top companies',
                },
                {
                  step: '03',
                  icon: <Shield className="w-6 h-6" />,
                  title: 'AI Screening',
                  desc: 'Our AI reviews your profile against job requirements',
                },
                {
                  step: '04',
                  icon: <BarChart3 className="w-6 h-6" />,
                  title: 'Take Assessment',
                  desc: 'Complete a secure proctored coding interview',
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    {item.icon}
                  </div>
                  <span className="text-xs font-medium text-primary/60">Step {item.step}</span>
                  <h3 className="font-semibold mt-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold">Why Choose LotusHack</h2>
              <p className="text-muted-foreground mt-2">The intelligent recruitment platform for modern hiring</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'AI-Powered Screening',
                  desc: 'Advanced algorithms analyze resumes and match candidates with the best-fit positions automatically.',
                  icon: '🤖',
                },
                {
                  title: 'Secure Proctoring',
                  desc: 'Browser-based anti-cheat system with face verification and real-time monitoring.',
                  icon: '🛡️',
                },
                {
                  title: 'Real-time Analytics',
                  desc: 'Track your application status, test scores, and hiring progress with detailed dashboards.',
                  icon: '📊',
                },
                {
                  title: 'Smart Matching',
                  desc: 'Our AI learns your preferences and skills to surface the most relevant opportunities.',
                  icon: '🎯',
                },
                {
                  title: 'Coding Assessments',
                  desc: 'Integrated coding environment with auto-grading for technical interviews.',
                  icon: '💻',
                },
                {
                  title: 'Career Growth',
                  desc: 'Personalized recommendations and skill development resources to advance your career.',
                  icon: '📈',
                },
              ].map((item) => (
                <Card key={item.title} className="p-6 hover:shadow-card-hover transition-shadow">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Ready to Take the Next Step?
            </h2>
            <p className="text-lg text-primary-foreground/80">
              Join thousands of candidates who have found their dream jobs through LotusHack.
              It only takes a few minutes to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Create Free Account
                </Button>
              </Link>
              <Link to="/jobs">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Browse Jobs
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="10" fill="hsl(239 84%/67%)" fillOpacity="0.15" />
                <path d="M20 8L32 32H8L20 8Z" stroke="hsl(239 84%/67%)" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="20" cy="22" r="4" fill="hsl(239 84%/67%)" />
              </svg>
              <span className="font-semibold">LotusHack</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} LotusHack. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}


