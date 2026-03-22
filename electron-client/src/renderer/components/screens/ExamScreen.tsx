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
import { localProctorService } from '@/renderer/services/local-proctor-service'
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
  FileText,
  Keyboard,
  Lightbulb,
} from 'lucide-react'

// LeetCode-style question panel component
function QuestionPanel({
  question,
  sections,
}: {
  question: any
  sections: QuestionSections
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Question Title Bar */}
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              question.difficulty === 'easy'
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : question.difficulty === 'medium'
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
            )}
          >
            {question.difficulty}
          </Badge>
          <h2 className="text-lg font-semibold text-white">{question.title}</h2>
        </div>
      </div>

      {/* Question Content - LeetCode Style */}
      <div className="p-6 space-y-6">
        {/* Problem Description */}
        {sections.problem && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </h3>
            <div className="prose prose-invert max-w-none">
              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                {sections.problem}
              </p>
            </div>
          </div>
        )}

        {/* Examples */}
        {question.examples && question.examples.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Examples
            </h3>
            <div className="space-y-4">
              {question.examples.map((example: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-900/50 rounded-lg p-4 border border-slate-800"
                >
                  <div className="space-y-2 font-mono text-sm">
                    <div>
                      <span className="text-slate-500">Input: </span>
                      <span className="text-blue-400">{example.input}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Output: </span>
                      <span className="text-green-400">{example.output}</span>
                    </div>
                    {example.explanation && (
                      <div>
                        <span className="text-slate-500">Explanation: </span>
                        <span className="text-slate-400">{example.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Constraints */}
        {question.constraints && question.constraints.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              Constraints
            </h3>
            <ul className="list-disc list-inside space-y-1 font-mono text-sm">
              {question.constraints.map((constraint: string, idx: number) => (
                <li key={idx} className="text-slate-300">
                  {constraint}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Input Format */}
        {sections.input && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Input Format
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
              <p className="text-slate-200 font-mono text-sm whitespace-pre-wrap">
                {sections.input}
              </p>
            </div>
          </div>
        )}

        {/* Output Format */}
        {sections.output && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Output Format
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
              <p className="text-slate-200 font-mono text-sm whitespace-pre-wrap">
                {sections.output}
              </p>
            </div>
          </div>
        )}

        {/* Note */}
        {sections.note && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Note
            </h3>
            <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
              <p className="text-amber-200 text-sm whitespace-pre-wrap">{sections.note}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Parse formatted question sections from the API response
interface QuestionSections {
  problem: string
  input: string
  output: string
  note?: string
}

function parseQuestionSections(fullText: string): QuestionSections {
  const sections: QuestionSections = {
    problem: '',
    input: '',
    output: '',
  }

  // Parse the formatted text with emoji markers
  const problemMatch = fullText.match(/📝 \*\*Problem\*\*\s*([\s\S]*?)(?=\n📥|\n📤|\n📌|$)/)
  const inputMatch = fullText.match(/📥 \*\*Input\*\*\s*([\s\S]*?)(?=\n📤|\n📌|$)/)
  const outputMatch = fullText.match(/📤 \*\*Output\*\*\s*([\s\S]*?)(?=\n📌|$)/)
  const noteMatch = fullText.match(/📌 \*\*Note\*\*\s*([\s\S]*?)$/)

  if (problemMatch) sections.problem = problemMatch[1].trim()
  if (inputMatch) sections.input = inputMatch[1].trim()
  if (outputMatch) sections.output = outputMatch[1].trim()
  if (noteMatch) sections.note = noteMatch[1].trim()

  // If no emoji markers found, try to parse the raw text
  if (!sections.problem && fullText) {
    // Check if it contains the markers at all
    if (!fullText.includes('📝') && !fullText.includes('📥')) {
      // Try heuristic parsing
      const lines = fullText.split('\n')
      let currentSection = 'problem'
      const sectionContents: string[] = []

      for (const line of lines) {
        const lowerLine = line.toLowerCase().trim()

        if (lowerLine.includes('input:') || lowerLine.startsWith('input ')) {
          if (sectionContents.length > 0 && currentSection === 'problem') {
            sections.problem = sectionContents.join('\n').trim()
          }
          currentSection = 'input'
          sectionContents.length = 0
          const content = line.replace(/input:?\s*/i, '').trim()
          if (content) sectionContents.push(content)
        } else if (lowerLine.includes('output:') || lowerLine.startsWith('output ')) {
          if (sectionContents.length > 0 && currentSection === 'input') {
            sections.input = sectionContents.join('\n').trim()
          }
          currentSection = 'output'
          sectionContents.length = 0
          const content = line.replace(/output:?\s*/i, '').trim()
          if (content) sectionContents.push(content)
        } else {
          sectionContents.push(line)
        }
      }

      // Save last section
      if (sectionContents.length > 0) {
        if (currentSection === 'output') {
          sections.output = sectionContents.join('\n').trim()
        } else if (currentSection === 'problem' && !sections.problem) {
          sections.problem = sectionContents.join('\n').trim()
        }
      }

      // If still empty, use full text as problem
      if (!sections.problem) {
        sections.problem = fullText
      }
    } else {
      // Just use the full text if it has some markers but we couldn't parse
      sections.problem = fullText
    }
  }

  return sections
}

const DEFAULT_LANGUAGE: Language = 'python'

// Simple fade animation variants
const fadeVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  },
  exit: { opacity: 0 },
}

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
    if (!aiStream0 || !aiStream1) return;

    console.log('[ExamScreen] Proctor setup - aiStream0 active:', aiStream0.active, 'aiStream1 active:', aiStream1.active);
    if (videoRef0.current) videoRef0.current.srcObject = aiStream0;
    if (videoRef1.current) videoRef1.current.srcObject = aiStream1;

    localProctorService.setCallbacks(
      (state) => setAIProctorState(state),
      (alert) => handleAIAlert(alert)
    );

    localProctorService.connect(aiStream1, aiStream0).catch((err) => {
      console.error('[ExamScreen] AI service connection failed:', err);
    });

    return () => {
      console.log('[ExamScreen] Cleanup - stopping proctor');
      localProctorService.stop();
    };
  }, [aiStream0, aiStream1, setAIProctorState, handleAIAlert])

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

  // Parse question sections for display
  const questionSections = currentQuestion
    ? parseQuestionSections(currentQuestion.question)
    : null

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
          <div className="space-y-4">
            {/* LeetCode-style Question Panel */}
            <QuestionPanel
              question={currentQuestion}
              sections={questionSections || { problem: currentQuestion.question, input: '', output: '' }}
            />
            {/* Code Editor */}
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
          </div>
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
                showAIPanel && theme === 'light' ? 'bg-slate-100 border-slate-300' : ''
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
          {/* AI Camera Preview */}
          <div className="space-y-2">
            <h3 className={cn(
              "text-sm font-medium",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            )}>
              AI Cameras
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900">
                <video
                  ref={videoRef0}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-white text-[10px] flex items-center gap-1">
                  <Hand className="w-3 h-3" />
                  Hand
                </div>
                {aiProctorState && (
                  <div className={cn(
                    'absolute top-1 right-1 w-2 h-2 rounded-full',
                    aiProctorState.handsDetected > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-500'
                  )} />
                )}
              </div>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900">
                <video
                  ref={videoRef1}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-white text-[10px] flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Face
                </div>
                {aiProctorState && (
                  <div className={cn(
                    'absolute top-1 right-1 w-2 h-2 rounded-full',
                    aiProctorState.faceCount === 1 ? 'bg-green-500 animate-pulse' :
                    aiProctorState.faceCount === 0 ? 'bg-red-500' : 'bg-red-500 animate-pulse'
                  )} />
                )}
              </div>
            </div>
            {aiProctorState && <AIOverlay state={aiProctorState} />}
          </div>

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
                  variants={fadeVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="max-w-4xl mx-auto space-y-6"
                >
                  {/* Question Header */}
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge 
                            variant="outline"
                            className={cn(
                              currentQuestion?.difficulty === 'easy' 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : currentQuestion?.difficulty === 'medium' 
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-red-100 text-red-800 border-red-200'
                            )}
                          >
                            {currentQuestion?.difficulty}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {currentQuestion?.title}
                          </span>
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">
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
                  variants={fadeVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-80 lg:w-96 border-l border-border bg-card overflow-hidden"
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
