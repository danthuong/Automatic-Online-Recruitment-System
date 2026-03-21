import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Calendar, Clock, Play,
  CheckCircle2, XCircle, AlertCircle, Star, Download,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { testService } from '@/services/testService'
import type { TestResponse } from '@/types/index'
import { TestStatus } from '@/types/index'
import { cn } from '@/lib/utils'

const TEST_STATUS_CONFIG: Record<string, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'
  icon: React.ElementType
}> = {
  [TestStatus.PENDING]: { label: 'Pending', variant: 'secondary', icon: Clock },
  [TestStatus.READY]: { label: 'Ready', variant: 'success', icon: CheckCircle2 },
  [TestStatus.IN_PROGRESS]: { label: 'In Progress', variant: 'warning', icon: AlertCircle },
  [TestStatus.SUBMITTED]: { label: 'Submitted', variant: 'default', icon: CheckCircle2 },
  [TestStatus.GRADED]: { label: 'Graded', variant: 'success', icon: Star },
  [TestStatus.EXPIRED]: { label: 'Expired', variant: 'destructive', icon: XCircle },
}

export function MyTestsPage() {
  const [tests, setTests] = useState<TestResponse[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await testService.getMyTests()
      setTests(data)
    } catch {
      setTests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTests()
  }, [fetchTests])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tests</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your technical assessments
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : tests.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No tests yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              Complete your applications to unlock technical assessments
            </p>
            <Link to="/jobs">
              <Button>
                Browse Jobs <Building2 className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => {
              const cfg = TEST_STATUS_CONFIG[test.status] || { label: test.status, variant: 'secondary' as const, icon: Clock }
              const StatusIcon = cfg.icon

              return (
                <Card key={test.id} className="hover:border-primary/30 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                          test.status === TestStatus.GRADED ? 'bg-success/10' :
                          test.status === TestStatus.IN_PROGRESS ? 'bg-warning/10' :
                          test.status === TestStatus.READY ? 'bg-success/10' :
                          'bg-primary/10'
                        )}>
                          <StatusIcon className={cn('w-6 h-6', {
                            'text-success': ['READY', 'GRADED'].includes(test.status),
                            'text-warning': test.status === TestStatus.IN_PROGRESS,
                            'text-primary': !['READY', 'GRADED', 'IN_PROGRESS'].includes(test.status),
                          })} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">Technical Assessment</p>
                            <Badge variant={cfg.variant} className="text-xs">
                              {cfg.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {test.totalTime} min
                            </span>
                            {test.language && (
                              <span>{test.language}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {test.scheduledAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Scheduled: {new Date(test.scheduledAt).toLocaleString()}
                              </span>
                            )}
                            {test.startedAt && (
                              <span>Started: {new Date(test.startedAt).toLocaleString()}</span>
                            )}
                            {test.submittedAt && (
                              <span>Submitted: {new Date(test.submittedAt).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {test.status === TestStatus.READY && (
                          <>
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            <Button size="sm">
                              <Play className="w-4 h-4 mr-2" />
                              Start
                            </Button>
                          </>
                        )}
                        {test.status === TestStatus.IN_PROGRESS && (
                          <Button size="sm">
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                        )}
                        {test.status === TestStatus.SUBMITTED && (
                          <span className="text-sm text-muted-foreground self-center px-2">
                            Awaiting results
                          </span>
                        )}
                        {test.status === TestStatus.GRADED && (
                          <span className="text-sm text-success font-medium self-center px-2">
                            Results available
                          </span>
                        )}
                        {test.status === TestStatus.PENDING && (
                          <span className="text-sm text-muted-foreground self-center px-2">
                            Not yet scheduled
                          </span>
                        )}
                        {test.status === TestStatus.EXPIRED && (
                          <span className="text-sm text-destructive self-center px-2">
                            Expired
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
