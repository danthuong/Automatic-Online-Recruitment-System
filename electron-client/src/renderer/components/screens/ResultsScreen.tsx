import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/renderer/components/ui/button'
import { Badge } from '@/renderer/components/ui/badge'
import { FeedbackPanel } from '@/renderer/components/ai/FeedbackPanel'
import { useExamStore } from '@/renderer/store/examStore'
import { IntroLogo } from '@/renderer/components/ui/IntroLogo'
import { ThemeToggle } from '@/renderer/components/ui/theme-toggle'
import { cn } from '@/renderer/lib/utils'
import { useTheme } from '@/renderer/hooks/useTheme'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ShieldX, 
  XCircle, 
  Download,
  RotateCcw,
  Check,
  X,
} from 'lucide-react'

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

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 0.61, 0.36, 1] as const, // Fabric easing
    },
  },
}

export function ResultsScreen() {
  const { 
    questions, 
    answers, 
    warnings, 
    testId, 
    candidateName, 
    disqualificationReason, 
    strikeCount, 
    reset,
    startTime,
  } = useExamStore()
  const examStartTime = startTime
  const examEndTime = new Date()
  const { theme } = useTheme()
  
  const isDisqualified = !!disqualificationReason
  
  const answeredCount = answers.size
  const totalQuestions = questions.length
  const warningCount = warnings.length
  const completionRate = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0
  const correctCount = Math.floor(answeredCount * 0.8)
  const score = completionRate > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  const duration = examEndTime && examStartTime
    ? Math.round((examEndTime.getTime() - examStartTime.getTime()) / 1000)
    : 0
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60

  useEffect(() => {
    // Clean up any ongoing processes
    return () => {
      // Cleanup on unmount
    }
  }, [])

  const handleExit = async () => {
    if (window.electronAPI) {
      await window.electronAPI.exam.setKiosk(false)
      await window.electronAPI.exam.disableFullscreen()
      await window.electronAPI.exam.close()
    }
    reset()
  }

  const handleNewExam = () => {
    reset()
  }

  const getStatusConfig = () => {
    if (isDisqualified) {
      return {
        icon: XCircle,
        title: 'Exam Terminated',
        subtitle: 'Your exam has been terminated due to rule violations',
        color: 'red',
      }
    }
    if (score >= 80) {
      return {
        icon: CheckCircle,
        title: 'Excellent Performance!',
        subtitle: 'Your assessment has been successfully submitted',
        color: 'green',
      }
    }
    if (score >= 60) {
      return {
        icon: CheckCircle,
        title: 'Assessment Complete',
        subtitle: 'Your assessment has been successfully submitted',
        color: 'amber',
      }
    }
    return {
      icon: CheckCircle,
      title: 'Assessment Complete',
      subtitle: 'Your assessment has been successfully submitted',
      color: 'slate',
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <div className={cn(
      "min-h-screen",
      theme === 'dark' ? 'bg-background' : 'bg-slate-50'
    )}>
      {/* Header */}
      <header className={cn(
        "px-6 py-4 border-b",
        theme === 'dark' 
          ? 'bg-card/50 border-border' 
          : 'bg-white border-slate-200'
      )}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IntroLogo size={36} />
            <span className={cn(
              "text-lg font-semibold",
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              HCMUT Recruitment
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={cn(
                "px-3 py-1",
                theme === 'dark' ? 'bg-secondary text-slate-300' : 'bg-slate-100 text-slate-600'
              )}
            >
              Results
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content - Asian gentle fade */}
      <main className="px-6 py-8">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto space-y-8"
        >
          {/* Status Header */}
          <motion.div 
            variants={fadeUpVariants}
            className="text-center"
          >
            {/* Status Icon */}
            <div className="relative inline-block mb-6">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center",
                statusConfig.color === 'green' && theme === 'dark' ? 'bg-green-500/20' :
                statusConfig.color === 'green' ? 'bg-green-100' :
                statusConfig.color === 'amber' && theme === 'dark' ? 'bg-amber-500/20' :
                statusConfig.color === 'amber' ? 'bg-amber-100' :
                statusConfig.color === 'red' && theme === 'dark' ? 'bg-red-500/20' :
                statusConfig.color === 'red' ? 'bg-red-100' :
                theme === 'dark' ? 'bg-slate-500/20' : 'bg-slate-100'
              )}>
                <StatusIcon 
                  className={cn(
                    "w-10 h-10",
                    statusConfig.color === 'green' && 'text-green-600',
                    statusConfig.color === 'amber' && 'text-amber-600',
                    statusConfig.color === 'red' && 'text-red-600',
                    statusConfig.color === 'slate' && theme === 'dark' && 'text-slate-400',
                    statusConfig.color === 'slate' && theme === 'light' && 'text-slate-600',
                  )} 
                />
              </div>
            </div>

            <h1 className={cn(
              "text-3xl font-semibold mb-2",
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              {statusConfig.title}
            </h1>
            
            <p className={cn(
              "text-base",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            )}>
              {statusConfig.subtitle}
            </p>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Cards */}
              <motion.div 
                variants={fadeUpVariants}
                className={cn(
                  "rounded-xl border p-6",
                  theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'
                )}
              >
                <h2 className={cn(
                  "text-lg font-semibold mb-6",
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                )}>
                  Performance Summary
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard 
                    label="Score" 
                    value={`${score}%`}
                    icon={CheckCircle}
                    theme={theme}
                    highlight
                  />
                  <StatCard 
                    label="Correct" 
                    value={`${correctCount}/${totalQuestions}`}
                    icon={Check}
                    theme={theme}
                  />
                  <StatCard 
                    label="Completed" 
                    value={`${completionRate}%`}
                    icon={Clock}
                    theme={theme}
                  />
                  <StatCard 
                    label="Warnings" 
                    value={warningCount}
                    icon={AlertTriangle}
                    theme={theme}
                    warning={warningCount > 0}
                  />
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                      Overall Score
                    </span>
                    <span className={cn(
                      "font-semibold",
                      score >= 80 && theme === 'dark' ? 'text-green-400' : 
                      score >= 80 ? 'text-green-600' :
                      score >= 60 && theme === 'dark' ? 'text-amber-400' :
                      score >= 60 ? 'text-amber-600' :
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-900'
                    )}>
                      {score}%
                    </span>
                  </div>
                  <div className={cn(
                    "h-3 rounded-full overflow-hidden",
                    theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
                  )}>
                    <motion.div 
                      className={cn(
                        "h-full rounded-full",
                        score >= 80 && 'bg-green-500' ||
                        score >= 60 && 'bg-amber-500' ||
                        'bg-slate-400'
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Time Stats */}
              <motion.div 
                variants={fadeUpVariants}
                className={cn(
                  "rounded-xl border p-6",
                  theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'
                )}
              >
                <h2 className={cn(
                  "text-lg font-semibold mb-4",
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                )}>
                  Time Management
                </h2>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-lg flex items-center justify-center",
                    theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'
                  )}>
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className={cn(
                      "text-3xl font-semibold",
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    )}>
                      {minutes}:{seconds.toString().padStart(2, '0')}
                    </p>
                    <p className={cn(
                      "text-sm",
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>
                      Time Taken
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Warnings/Disqualification */}
              {isDisqualified && (
                <motion.div 
                  variants={fadeUpVariants}
                  className={cn(
                    "rounded-xl border p-6",
                    theme === 'dark' 
                      ? 'bg-red-500/5 border-red-500/20' 
                      : 'bg-red-50 border-red-200'
                  )}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldX className={cn(
                      "w-6 h-6",
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    )} />
                    <span className={cn(
                      "font-semibold",
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    )}>
                      EXAM TERMINATED
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className={cn(
                        "text-sm font-medium mb-1",
                        theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      )}>
                        Violation:
                      </p>
                      <p className={cn(
                        "text-sm font-mono px-3 py-2 rounded-lg border",
                        theme === 'dark' 
                          ? 'bg-red-500/10 text-red-300 border-red-500/20' 
                          : 'bg-red-100 text-red-700 border-red-200'
                      )}>
                        {disqualificationReason}
                      </p>
                    </div>
                    
                    <div>
                      <p className={cn(
                        "text-sm font-medium mb-2",
                        theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      )}>
                        Strikes Accumulated:
                      </p>
                      <div className="flex gap-2">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold',
                              i <= strikeCount 
                                ? theme === 'dark'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-red-500 text-white'
                                : theme === 'dark'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-red-100 text-red-400 border border-red-200'
                            )}
                          >
                            {i}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {warningCount > 0 && !isDisqualified && (
                <motion.div 
                  variants={fadeUpVariants}
                  className={cn(
                    "rounded-xl border p-4",
                    theme === 'dark' 
                      ? 'bg-amber-500/5 border-amber-500/20' 
                      : 'bg-amber-50 border-amber-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={cn(
                      "w-5 h-5",
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    )} />
                    <div>
                      <p className={cn(
                        "font-medium",
                        theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                      )}>
                        Proctoring Notes
                      </p>
                      <p className={cn(
                        "text-sm",
                        theme === 'dark' ? 'text-amber-400/70' : 'text-amber-600/70'
                      )}>
                        {warningCount} warning{warningCount > 1 ? 's were' : ' was'} recorded during your exam.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column - Details */}
            <motion.div 
              variants={fadeUpVariants}
              className={cn(
                "rounded-xl border p-6 h-fit",
                theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'
              )}
            >
              <h2 className={cn(
                "text-lg font-semibold mb-4",
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                Exam Details
              </h2>

              {/* Info Section */}
              <div className="space-y-4">
                {[
                  { label: 'Test ID', value: testId, mono: true },
                  { label: 'Candidate', value: candidateName },
                  { label: 'Questions', value: `${totalQuestions}` },
                  { label: 'Submitted At', value: new Date().toLocaleString() },
                ].map((item) => (
                  <div 
                    key={item.label} 
                    className={cn(
                      "flex items-center justify-between text-sm pb-3 border-b last:border-0",
                      theme === 'dark' ? 'border-border' : 'border-slate-100'
                    )}
                  >
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                      {item.label}
                    </span>
                    <span className={cn(
                      theme === 'dark' ? 'text-white' : 'text-slate-900',
                      item.mono && 'font-mono text-primary'
                    )}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex gap-4"
          >
            <Button
              variant="outline"
              size="lg"
              className="flex-1 gap-2"
              onClick={handleNewExam}
            >
              <RotateCcw className="w-4 h-4" />
              Start New Assessment
            </Button>
            <Button
              size="lg"
              className="flex-1 gap-2"
              onClick={handleExit}
            >
              <Download className="w-4 h-4" />
              Download Report
            </Button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  theme,
  highlight,
  warning,
}: { 
  label: string
  value: string | number
  icon: React.ElementType
  theme: string
  highlight?: boolean
  warning?: boolean
}) {
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      highlight && theme === 'dark' ? 'bg-primary/5 border-primary/20' :
      highlight && theme === 'light' ? 'bg-blue-50 border-blue-200' :
      warning && theme === 'dark' ? 'bg-amber-500/5 border-amber-500/20' :
      warning && theme === 'light' ? 'bg-amber-50 border-amber-200' :
      theme === 'dark' ? 'bg-secondary/50 border-border' : 'bg-slate-50 border-slate-200'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn(
          "w-4 h-4",
          highlight && 'text-primary',
          warning && (theme === 'dark' ? 'text-amber-400' : 'text-amber-600'),
          !highlight && !warning && (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')
        )} />
        <span className={cn(
          "text-xs",
          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
        )}>
          {label}
        </span>
      </div>
      <p className={cn(
        "text-2xl font-semibold",
        highlight && theme === 'dark' ? 'text-white' :
        highlight && theme === 'light' ? 'text-slate-900' :
        warning && (theme === 'dark' ? 'text-amber-400' : 'text-amber-600') ||
        theme === 'dark' ? 'text-white' : 'text-slate-900'
      )}>
        {value}
      </p>
    </div>
  )
}
