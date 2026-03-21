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
          console.log('[App] Loading questions from API...', loginData)

          // Step 1: Login to backend with testId (email) and candidateId (password)
          console.log('[App] Authenticating with backend...')
          const authResult = await loginToBackend(loginData.testId, loginData.candidateId)
          console.log('[App] Authenticated as:', authResult.user.email)

          // Step 2: Fetch candidate profile (includes CV URL, GitHub URL, etc.)
          console.log('[App] Fetching candidate profile...')
          const profile = await fetchCandidateProfile()
          console.log('[App] Profile loaded:', {
            name: profile.user?.firstName,
            skills: profile.skills,
            hasCV: !!profile.cvUrl,
            hasGitHub: !!profile.githubUrl,
          })

          // Set candidate name from profile
          const candidateName = profile.user?.firstName
            ? `${profile.user.firstName} ${profile.user.lastName || ''}`.trim()
            : loginData.candidateName
          useExamStore.getState().setCandidateName(candidateName)

          // Step 3: Fetch CV content if available
          let cvContent = ''
          if (profile.cvUrl) {
            try {
              console.log('[App] Fetching CV content...')
              cvContent = await fetchCVContent()
              console.log('[App] CV content loaded:', cvContent.substring(0, 100) + '...')
            } catch (cvErr) {
              console.warn('[App] Failed to fetch CV:', cvErr)
            }
          }

          // Step 4: Fetch GitHub profile if URL is available
          let githubData: GitHubProfileData | undefined
          if (profile.githubUrl) {
            try {
              // Extract username from GitHub URL
              const match = profile.githubUrl.match(/github\.com\/([^\/]+)/)
              if (match) {
                console.log('[App] Fetching GitHub profile:', match[1])
                const ghProfile = await fetchGitHubProfile(match[1])
                if (ghProfile) {
                  githubData = ghProfile
                  console.log('[App] GitHub profile fetched:', ghProfile.username, ghProfile.repositories.length, 'repos')
                }
              }
            } catch (ghErr) {
              console.warn('[App] Failed to fetch GitHub:', ghErr)
            }
          }

          // Step 5: Generate interview questions using profile data
          console.log('[App] Calling generateInterview API...')
          const response = await generateInterview(
            candidateName,
            githubData,
            undefined // jobDescription - can be added if available from profile
          )

          console.log('[App] Interview generated:', response.questions.length, 'questions')

          // Convert backend questions to app format
          const appQuestions: Question[] = response.questions.map((q, idx) => {
            const converted = convertToAppQuestion(q)
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
