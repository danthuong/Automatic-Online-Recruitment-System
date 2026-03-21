import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useExamStore, Question } from '@/renderer/store/examStore'
import { ThemeProvider } from '@/renderer/contexts/ThemeContext'
import { LoginScreen } from '@/renderer/components/screens/LoginScreen'
import { PreCheckScreen } from '@/renderer/components/screens/PreCheckScreen'
import { ExamScreen } from '@/renderer/components/screens/ExamScreen'
import { ResultsScreen } from '@/renderer/components/screens/ResultsScreen'
import { ErrorBoundary } from '@/renderer/components/ErrorBoundary'
import { IntroScreen } from '@/renderer/components/screens/IntroScreen'
import {
  generateInterview,
  fetchGitHubProfile,
  convertToAppQuestion,
  GitHubProfileData,
  loginToBackend,
  fetchCandidateProfile,
  fetchCVContent,
  fetchTestById,
  convertNodeJSToAppQuestion,
} from '@/renderer/services/interview-api'

// Total exam time: 75 minutes (allows 15 min per question)
const totalTime = 75 * 60

// Professional page transitions - slow, smooth
const pageVariants: Variants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: 'easeIn' as const,
    },
  },
}

function App() {
  const { status, setQuestions, questions, setLogin, setCandidateName } = useExamStore()
  const [showIntro, setShowIntro] = useState(true)
  const [introCompleted, setIntroCompleted] = useState(false)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)

  // Load questions from API when transitioning from login to precheck
  useEffect(() => {
    const loadQuestionsFromAPI = async () => {
      if (status === 'precheck' || status === 'exam') {
        // Check if we already have questions (to avoid reloading)
        if (questions.length > 0) return

        // Get login data from window (set by LoginScreen)
        const loginData = (window as any).__loginData
        if (!loginData) {
          console.log('[App] No login data, using fallback questions')
          return
        }

        setIsLoadingQuestions(true)
        setQuestionError(null)

        try {
          console.log('[App] Loading questions from Node.js API...', loginData)

          // Fetch test from Node.js server using testId
          console.log('[App] Fetching test from Node.js API...')
          const testResponse = await fetchTestById(loginData.testId)

          console.log('[App] Test loaded:', testResponse.questions.length, 'questions')

          // Convert Node.js questions to app format
          const appQuestions: Question[] = testResponse.questions.map((q, idx) => {
            const converted = convertNodeJSToAppQuestion(q)
            console.log(`[App] Question ${idx + 1}:`, converted.id, converted.type, converted.difficulty)
            return converted
          })

          setQuestions(appQuestions, totalTime)
          console.log('[App] Questions loaded successfully:', appQuestions.length)

        } catch (err) {
          console.error('[App] Failed to load questions:', err)
          setQuestionError(err instanceof Error ? err.message : 'Failed to load questions')
        } finally {
          setIsLoadingQuestions(false)
        }
      }
    }

    loadQuestionsFromAPI()
  }, [status])

  useEffect(() => {
    console.log('[App] Status changed to:', status, '| Questions:', questions.length)
  }, [status, questions.length])

  const renderScreen = () => {
    // Show login first time, then show based on status
    if (status === 'idle' || status === 'login') {
      return <LoginScreen />
    }

    switch (status) {
      case 'precheck':
        return <PreCheckScreen />
      case 'exam':
      case 'disqualified':
        if (questions.length === 0) {
          console.error('[App] Questions not loaded!')
          return (
            <div className="min-h-screen bg-background flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-destructive">Error: Questions not loaded</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded">
                  Reload
                </button>
              </div>
            </div>
          )
        }
        return (
          <ErrorBoundary>
            <ExamScreen />
          </ErrorBoundary>
        )
      case 'submitted':
        return <ResultsScreen />
      default:
        return <LoginScreen />
    }
  }

  return (
    <ThemeProvider>
      {/* Intro Screen */}
      {showIntro && !introCompleted && (
        <IntroScreen 
          onComplete={() => {
            setIntroCompleted(true)
            setShowIntro(false)
          }} 
        />
      )}
      
      {/* Main Application */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          className="min-h-screen"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
    </ThemeProvider>
  )
}

export default App
