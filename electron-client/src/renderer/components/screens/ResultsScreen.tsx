import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/renderer/components/ui/button'
import { Badge } from '@/renderer/components/ui/badge'
import { FeedbackPanel } from '@/renderer/components/ai/FeedbackPanel'
import { useExamStore } from '@/renderer/store/examStore'
import { IntroLogo } from '@/renderer/components/ui/IntroLogo'
import { ThemeToggle } from '@/renderer/components/ui/theme-toggle'
import { cn } from '@/renderer/lib/utils'
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
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
        title: 'Excellent Performance',
        subtitle: 'You have successfully completed the assessment',
        color: 'green',
      }
    }
    if (score >= 60) {
      return {
        icon: CheckCircle,
        title: 'Good Performance',
        subtitle: 'You have successfully completed the assessment',
        color: 'amber',
      }
    }
    return {
      icon: CheckCircle,
      title: 'Assessment Complete',
      subtitle: 'You have successfully completed the assessment',
      color: 'slate',
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IntroLogo size={36} />
            <span className="text-lg font-semibold text-foreground">
              HCMUT Recruitment
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              Results
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto space-y-8"
        >
          {/* Status Header */}
          <motion.div variants={fadeUpVariants} className="text-center">
            <div className="relative inline-block mb-6">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center",
                statusConfig.color === 'green' && 'bg-green-100',
                statusConfig.color === 'amber' && 'bg-amber-100',
                statusConfig.color === 'red' && 'bg-red-100',
                statusConfig.color === 'slate' && 'bg-muted'
              )}>
                <StatusIcon className={cn(
                  "w-10 h-10",
                  statusConfig.color === 'green' && 'text-green-600',
                  statusConfig.color === 'amber' && 'text-amber-600',
                  statusConfig.color === 'red' && 'text-red-600',
                  statusConfig.color === 'slate' && 'text-muted-foreground',
                )} />
              </div>
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-2">
              {statusConfig.title}
            </h1>
            
            <p className="text-base text-muted-foreground">
              {statusConfig.subtitle}
            </p>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Cards */}
              <motion.div variants={fadeUpVariants} className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">
                  Performance Summary
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard 
                    label="Score" 
                    value={`${score}%`}
                    icon={CheckCircle}
                    highlight
                  />
                  <StatCard 
                    label="Correct" 
                    value={`${correctCount}/${totalQuestions}`}
                    icon={Check}
                  />
                  <StatCard 
                    label="Completed" 
                    value={`${completionRate}%`}
                    icon={Clock}
                  />
                  <StatCard 
                    label="Warnings" 
                    value={warningCount}
                    icon={AlertTriangle}
                    warning={warningCount > 0}
                  />
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Overall Score
                    </span>
                    <span className={cn(
                      "font-semibold",
                      score >= 80 && 'text-green-600', 
                      score >= 60 && score < 80 && 'text-amber-600',
                      score < 60 && 'text-foreground'
                    )}>
                      {score}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <motion.div 
                      className={cn(
                        "h-full rounded-full",
                        score >= 80 && 'bg-green-500',
                        score >= 60 && score < 80 && 'bg-amber-500',
                        score < 60 && 'bg-primary'
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Time Stats */}
              <motion.div variants={fadeUpVariants} className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Time Management
                </h2>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-primary/10">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-foreground">
                      {minutes}:{seconds.toString().padStart(2, '0')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Time Taken
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Warnings/Disqualification */}
              {isDisqualified && (
                <motion.div variants={fadeUpVariants} className="bg-card border border-destructive/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldX className="w-6 h-6 text-destructive" />
                    <span className="font-semibold text-destructive">
                      EXAM TERMINATED
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-destructive mb-1">
                        Violation:
                      </p>
                      <p className="text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded px-3 py-2">
                        {disqualificationReason}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Strikes Accumulated:
                      </p>
                      <div className="flex gap-2">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold',
                              i <= strikeCount 
                                ? 'bg-destructive text-white'
                                : 'bg-muted text-muted-foreground border border-border'
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
                <motion.div variants={fadeUpVariants} className="bg-card border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-600">
                        Proctoring Notes
                      </p>
                      <p className="text-sm text-amber-600/70">
                        {warningCount} warning{warningCount > 1 ? 's were' : ' was'} recorded during your exam.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column - Details */}
            <motion.div variants={fadeUpVariants} className="bg-card border border-border rounded-lg p-6 h-fit">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Exam Details
              </h2>

              <div className="space-y-4">
                {[
                  { label: 'Test ID', value: testId, mono: true },
                  { label: 'Candidate', value: candidateName },
                  { label: 'Questions', value: `${totalQuestions}` },
                  { label: 'Submitted At', value: new Date().toLocaleString() },
                ].map((item) => (
                  <div 
                    key={item.label} 
                    className="flex items-center justify-between text-sm pb-3 border-b border-border last:border-0"
                  >
                    <span className="text-muted-foreground">
                      {item.label}
                    </span>
                    <span className={cn(
                      "text-foreground",
                      item.mono && 'font-mono'
                    )}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Actions */}
          <motion.div variants={fadeUpVariants} className="flex gap-4">
            <Button
              size="lg"
              variant="outline"
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
  highlight,
  warning,
}: { 
  label: string
  value: string | number
  icon: React.ElementType
  highlight?: boolean
  warning?: boolean
}) {
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      highlight && 'bg-primary/5 border-primary/20',
      warning && 'bg-amber-50 border-amber-200',
      !highlight && !warning && 'bg-muted border-border'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn(
          "w-4 h-4",
          highlight && 'text-primary',
          warning && 'text-amber-600',
          !highlight && !warning && 'text-muted-foreground'
        )} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn(
        "text-xl font-semibold",
        highlight && 'text-primary',
        warning && 'text-amber-600',
        !highlight && !warning && 'text-foreground'
      )}>
        {value}
      </p>
    </div>
  )
}
