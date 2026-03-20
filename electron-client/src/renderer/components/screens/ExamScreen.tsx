import React, { useCallback, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer } from '@/renderer/components/exam/Timer'
import { QuestionNav } from '@/renderer/components/exam/QuestionNav'
import { InterviewerChat } from '@/renderer/components/ai/InterviewerChat'
import { MultipleChoice } from '@/renderer/components/questions/MultipleChoice'
import { CodeEditor } from '@/renderer/components/questions/CodeEditor'
import { EssayInput } from '@/renderer/components/questions/EssayInput'
import { WarningBanner } from '@/renderer/components/proctoring/WarningBanner'
import { Button } from '@/renderer/components/ui/button'
import { Badge } from '@/renderer/components/ui/badge'
import { ThemeToggle } from '@/renderer/components/ui/theme-toggle'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/renderer/components/ui/dialog'
import { useExamStore, Language } from '@/renderer/store/examStore'
import { IntroLogo } from '@/renderer/components/ui/IntroLogo'
import { cn } from '@/renderer/lib/utils'
import { InputTracker } from '@/renderer/input-tracker'
import { useTheme } from '@/renderer/hooks/useTheme'
import { 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Send, 
  AlertTriangle, 
  ShieldX, 
  Code2, 
  Bot, 
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'

const DEFAULT_LANGUAGE: Language = 'python'

function getStarterCode(question: any, language: Language): string {
  if (!question.starterCode) return ''
  if (typeof question.starterCode === 'string') return question.starterCode
  if (typeof question.starterCode === 'object') {
    return question.starterCode[language] || question.starterCode[DEFAULT_LANGUAGE] || ''
  }
  return ''
}

export function ExamScreen() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAIPanel, setShowAIPanel] = useState(true)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showDisqualifyDialog, setShowDisqualifyDialog] = useState(false)

  const {
    questions,
    currentQuestionIndex,
    answers,
    flagged,
    warnings,
    totalTime,
    testId,
    strikeCount,
    status,
    addWarning,
    addTimelineEvent,
    addStrike,
    setCurrentQuestion,
    setAnswer,
    toggleFlag,
    submitExam,
    dismissWarning,
    showWarningDialog,
    dismissWarningDialog,
    lastStrikeReason,
  } = useExamStore()

  const { theme } = useTheme()
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(DEFAULT_LANGUAGE)

  useEffect(() => {
    console.log('[ExamScreen] Mounted, questions:', questions.length)
    if (questions.length === 0) {
      setError('No questions loaded. Please restart the exam.')
      return
    }
    setIsLoading(false)
    setError(null)
    setShowSubmitDialog(false)
    setShowDisqualifyDialog(false)
  }, [questions])

  useEffect(() => {
    if (status === 'disqualified') {
      setShowDisqualifyDialog(true)
    } else {
      setShowDisqualifyDialog(false)
    }
  }, [status])

  useEffect(() => {
    if (showWarningDialog) {
      setShowSubmitDialog(true)
    } else {
      setShowSubmitDialog(false)
    }
  }, [showWarningDialog])

  useEffect(() => {
    const tracker = new InputTracker({
      onPaste: (event) => {
        addTimelineEvent({
          timestamp: new Date(),
          type: 'paste',
          title: 'Paste Detected',
          details: `${event.data.length} characters pasted`,
          severity: event.data.suspicious ? 'warning' : 'info',
        })
        
        if (window.electronAPI) {
          window.electronAPI.proctor.logEvent({
            type: 'paste_event',
            data: event.data,
          })
        }
        
        if (event.data.suspicious) {
          addStrike('Suspicious paste detected')
        }
      },
      onSuspiciousPaste: (length) => {
        addWarning({
          type: 'major',
          message: `Suspicious paste detected: ${length} characters`,
        })
      },
      onIdleTime: (event) => {
        addTimelineEvent({
          timestamp: new Date(),
          type: 'idle',
          title: 'Idle Time',
          details: `No activity for ${Math.round(event.data.duration / 1000)} seconds`,
          severity: 'info',
        })
      },
    })

    tracker.start()

    if (window.electronAPI) {
      window.electronAPI.proctor.getScreenInfo().then((info) => {
        if (info.screenCount > 1) {
          addStrike('Multiple monitors detected')
        }
      })
      
      const unsubShortcut = window.electronEvents?.onShortcutBlocked((shortcut) => {
        console.log(`[ExamScreen] Shortcut blocked: ${shortcut}`)
        
        addTimelineEvent({
          timestamp: new Date(),
          type: 'warning',
          title: 'Shortcut Blocked',
          details: `Attempted shortcut: ${shortcut}`,
          severity: 'warning',
        })
        
        addWarning({
          type: 'major',
          message: `Forbidden shortcut detected: ${shortcut}`,
        })
        
        addStrike(`Forbidden shortcut: ${shortcut}`)
        
        window.electronAPI?.exam.getWindowBounds().then(() => {
          console.log('[ExamScreen] Attempting to refocus window')
        })
      })
      
      const unsubBlur = window.electronEvents?.onFocusLost(() => {
        console.log('[ExamScreen] Focus lost detected')
        
        addTimelineEvent({
          timestamp: new Date(),
          type: 'warning',
          title: 'Focus Lost',
          details: 'Window lost focus - possible Alt+Tab attempt',
          severity: 'warning',
        })
      })
      
      return () => {
        tracker.stop()
        unsubShortcut?.()
        unsubBlur?.()
      }
    }

    return () => {
      tracker.stop()
    }
  }, [])

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) || '' : ''
  const answeredIds = Array.from(answers.keys())

  const handleAnswer = useCallback(
    (value: string) => {
      if (currentQuestion) {
        setAnswer(currentQuestion.id, value)
      }
    },
    [currentQuestion, setAnswer]
  )

  const handleSubmit = async () => {
    if (window.electronAPI) {
      await window.electronAPI.exam.setKiosk(false)
      await window.electronAPI.exam.disableFullscreen()
      
      window.electronAPI.proctor.logEvent({
        type: 'exam_submit',
        data: {
          testId,
          strikeCount,
        },
      })
    }
    
    submitExam()
  }

  const handleWarningDismiss = () => {
    dismissWarningDialog()
    setShowSubmitDialog(false)
  }

  const handleSubmitAnyway = () => {
    dismissWarningDialog()
    setShowSubmitDialog(false)
    handleSubmit()
  }

  const renderQuestion = () => {
    if (!currentQuestion) return null

    switch (currentQuestion.type) {
      case 'mcq':
        return (
          <MultipleChoice
            question={currentQuestion.question}
            options={currentQuestion.options || []}
            selectedId={currentAnswer}
            onSelect={handleAnswer}
          />
        )
      case 'code':
        const starterCode = getStarterCode(currentQuestion, selectedLanguage)
        return (
          <CodeEditor
            question={currentQuestion.question}
            language={selectedLanguage}
            starterCode={starterCode}
            allowedLanguages={currentQuestion.allowedLanguages}
            value={currentAnswer}
            onChange={handleAnswer}
            onLanguageChange={setSelectedLanguage}
            onReset={() => handleAnswer(starterCode)}
          />
        )
      case 'essay':
        return (
          <EssayInput
            question={currentQuestion.question}
            value={currentAnswer}
            onChange={handleAnswer}
            minWords={currentQuestion.minWords}
            maxWords={currentQuestion.maxWords}
          />
        )
      default:
        return null
    }
  }

  if (isLoading || questions.length === 0) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center",
        theme === 'dark' ? 'bg-background' : 'bg-slate-50'
      )}>
        <div className="text-center space-y-4">
          <motion.div
            className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"
          />
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            Loading exam...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center",
        theme === 'dark' ? 'bg-background' : 'bg-slate-50'
      )}>
        <div className={cn(
          "text-center space-y-4 p-8 max-w-md rounded-xl border",
          theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'
        )}>
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className={cn(
            "text-xl font-semibold",
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Error Loading Exam
          </h2>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            {error}
          </p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "min-h-screen",
      theme === 'dark' ? 'bg-background' : 'bg-slate-50'
    )}>
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 border-b",
        theme === 'dark' 
          ? 'bg-card/80 border-border backdrop-blur-sm' 
          : 'bg-white border-slate-200'
      )}>
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left - Logo & Timer */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <IntroLogo size={36} />
              <span className={cn(
                "text-lg font-semibold hidden sm:block",
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                HCMUT
              </span>
            </div>
            
            <div className={cn(
              "h-6 w-px hidden sm:block",
              theme === 'dark' ? 'bg-border' : 'bg-slate-200'
            )} />
            
            <Timer
              initialTime={totalTime}
              onTimeUp={handleSubmit}
            />
          </div>

          {/* Center - Question Info */}
          <div className="hidden md:flex items-center gap-4">
            <Badge 
              variant="outline" 
              className={cn(
                "px-3 py-1.5",
                theme === 'dark' 
                  ? 'bg-secondary text-slate-300 border-border' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              )}
            >
              <Code2 className="w-4 h-4 mr-2 text-primary" />
              Question {currentQuestionIndex + 1} of {questions.length}
            </Badge>
            
            {flagged.has(currentQuestion?.id || '') && (
              <Badge 
                variant="outline" 
                className="px-3 py-1.5 bg-amber-50 text-amber-600 border-amber-200"
              >
                <Flag className="w-4 h-4 mr-2" />
                Flagged
              </Badge>
            )}
          </div>

          {/* Right - Status & AI Toggle */}
          <div className="flex items-center gap-3">
            {/* Strike Counter */}
            {strikeCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                  strikeCount >= 2 
                    ? 'bg-red-100 text-red-600 border border-red-200' 
                    : 'bg-amber-100 text-amber-600 border border-amber-200'
                )}
              >
                <AlertTriangle className="w-4 h-4" />
                {strikeCount}/3
              </motion.div>
            )}

            {/* AI Panel Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={cn(
                'gap-2',
                showAIPanel && theme === 'dark' ? 'bg-primary/10 border-primary/30' :
                showAIPanel && theme === 'light' ? 'bg-blue-50 border-blue-200' : ''
              )}
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Panel</span>
              {showAIPanel ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </Button>
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* Progress Bar */}
        <div className={cn(
          "h-1",
          theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
        )}>
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar */}
        <aside className={cn(
          "w-72 border-r p-4 space-y-4 overflow-y-auto",
          theme === 'dark' 
            ? 'bg-card/30 border-border backdrop-blur-sm' 
            : 'bg-white border-slate-200'
        )}>
          {/* Question Navigator */}
          <div className="space-y-2">
            <h3 className={cn(
              "text-sm font-medium",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            )}>
              Questions
            </h3>
            <QuestionNav
              questions={questions.map((q) => ({ id: q.id, type: q.type }))}
              currentIndex={currentQuestionIndex}
              answered={new Set(answeredIds)}
              flagged={flagged}
              onNavigate={setCurrentQuestion}
              onToggleFlag={toggleFlag}
            />
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className={cn(
                "text-sm font-medium",
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                Recent Warnings
              </h3>
              <WarningBanner warnings={warnings.slice(-3)} onDismiss={dismissWarning} />
            </div>
          )}
        </aside>

        {/* Main Editor Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Question Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion?.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              {/* Question Header */}
              <div className={cn(
                "rounded-xl border p-6",
                theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'
              )}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge 
                        variant="outline"
                        className={cn(
                          currentQuestion?.difficulty === 'easy' 
                            ? 'bg-green-50 text-green-600 border-green-200' 
                            : currentQuestion?.difficulty === 'medium' 
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-red-50 text-red-600 border-red-200'
                        )}
                      >
                        {currentQuestion?.difficulty}
                      </Badge>
                      <span className={cn(
                        "text-sm",
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      )}>
                        {currentQuestion?.title}
                      </span>
                    </div>
                    <h2 className={cn(
                      "text-xl font-semibold",
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    )}>
                      Question {currentQuestionIndex + 1}
                    </h2>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFlag(currentQuestion?.id || '')}
                    className={cn(
                      'gap-2',
                      flagged.has(currentQuestion?.id || '') && 'text-amber-600 bg-amber-50'
                    )}
                  >
                    <Flag className="w-4 h-4" />
                    {flagged.has(currentQuestion?.id || '') ? 'Flagged' : 'Flag'}
                  </Button>
                </div>

                {/* Question Body */}
                {renderQuestion()}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Exam
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestion(currentQuestionIndex + 1)}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* AI Panel */}
        <AnimatePresence>
          {showAIPanel && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "border-l overflow-hidden",
                theme === 'dark' 
                  ? 'bg-card/30 border-border backdrop-blur-sm' 
                  : 'bg-white border-slate-200'
              )}
            >
              <div className="h-full p-4">
                <InterviewerChat questionId={currentQuestion?.id || ''} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Strike Warning Dialog */}
      <Dialog open={showSubmitDialog && strikeCount > 0 && strikeCount < 3 && !showDisqualifyDialog} onOpenChange={(open) => !open && handleWarningDismiss()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Warning {strikeCount}/3
            </DialogTitle>
            <DialogDescription className="text-amber-700/70">
              {lastStrikeReason || 'A warning has been recorded.'}
            </DialogDescription>
          </DialogHeader>
          <div className={cn(
            "p-4 rounded-xl border space-y-2",
            theme === 'dark' 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
              : 'bg-amber-50 border-amber-200 text-amber-700'
          )}>
            <p className="text-sm">
              <strong>Warning:</strong> This incident has been recorded. 
              After 3 warnings, you will be <strong>disqualified</strong> from the exam.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleWarningDismiss}>
              Continue Exam
            </Button>
            <Button variant="default" onClick={handleSubmitAnyway}>
              Submit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disqualification Dialog */}
      <Dialog open={showDisqualifyDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldX className="h-6 w-6" />
              DISQUALIFIED
            </DialogTitle>
            <DialogDescription>
              You have been disqualified from this exam due to repeated violations.
            </DialogDescription>
          </DialogHeader>
          <div className={cn(
            "p-4 rounded-xl border space-y-3",
            theme === 'dark' 
              ? 'bg-red-500/10 border-red-500/20' 
              : 'bg-red-50 border-red-200'
          )}>
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
                {lastStrikeReason}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-medium",
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              )}>
                Strikes:
              </span>
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold',
                      i <= strikeCount 
                        ? theme === 'dark'
                          ? 'bg-red-500 text-white'
                          : 'bg-red-500 text-white'
                        : theme === 'dark'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-red-100 text-red-400'
                    )}
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
            <p className={cn(
              "text-sm",
              theme === 'dark' ? 'text-red-500/70' : 'text-red-500'
            )}>
              All violations have been logged and reported.
            </p>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleSubmit}>
              View Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog && strikeCount === 0} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
              Submit Exam?
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              You have answered {answeredIds.length} of {questions.length} questions.
              {answeredIds.length < questions.length && (
                <span className="block mt-2 text-amber-600">
                  {questions.length - answeredIds.length} questions are unanswered.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Exam
            </Button>
            <Button onClick={handleSubmit} className="gap-2">
              <Send className="w-4 h-4 mr-2" />
              Submit Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
