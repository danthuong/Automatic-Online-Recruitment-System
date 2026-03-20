import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/renderer/components/ui/button'
import { MultiCameraCapture } from '@/renderer/components/proctoring/MultiCameraCapture'
import { AIOverlay } from '@/renderer/components/proctoring/AIOverlay'
import { useExamStore } from '@/renderer/store/examStore'
import { IntroLogo } from '@/renderer/components/ui/IntroLogo'
import { ThemeToggle } from '@/renderer/components/ui/theme-toggle'
import { cn } from '@/renderer/lib/utils'
import { 
  Shield, 
  Webcam, 
  Mic, 
  Wifi, 
  Monitor, 
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Loader2,
  Fingerprint,
  Bot,
} from 'lucide-react'
import { aiProctorService } from '@/renderer/services/ai-proctor-service'
import { getAIServerUrl, getCachedServerUrl } from '@/renderer/services/ai-server'
import type { AIProctorState } from '@/renderer/services/ai-proctor-types'

interface ChecklistItem {
  id: string
  label: string
  description: string
  icon: React.ElementType
  status: 'pending' | 'checking' | 'passed' | 'failed'
  autoCheck?: () => Promise<boolean>
}

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

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
}

const CALIBRATION_REQUIRED_FRAMES = 30

export function PreCheckScreen() {
  const { testId, startExam, setAIStreams, setAIProctorState, handleAIAlert, aiProctorState } = useExamStore()
  
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { 
      id: 'camera', 
      label: 'Camera Access', 
      description: 'Two cameras required: face & hand detection',
      icon: Webcam, 
      status: 'pending',
    },
    { 
      id: 'aiserver', 
      label: 'AI Server', 
      description: 'Python AI server for face/gesture detection',
      icon: Bot, 
      status: 'pending',
    },
    { 
      id: 'network', 
      label: 'Network Connection', 
      description: 'Stable internet for real-time monitoring',
      icon: Wifi, 
      status: 'pending',
    },
    { 
      id: 'display', 
      label: 'Display Settings', 
      description: 'Single screen required',
      icon: Monitor, 
      status: 'pending',
      autoCheck: async () => {
        if (window.electronAPI) {
          try {
            const info = await window.electronAPI.proctor.getScreenInfo()
            if (info.screenCount > 1) {
              return false
            }
          } catch { /* ignore */ }
        }
        return true
      }
    },
  ])
  
  const [agreed, setAgreed] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [aiServerReady, setAiServerReady] = useState(false)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [aiState, setAiState] = useState<AIProctorState | null>(null)
  const [calibrationPhase, setCalibrationPhase] = useState(false)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const stream0Ref = useRef<MediaStream | null>(null)
  const stream1Ref = useRef<MediaStream | null>(null)

  useEffect(() => {
    checklist.forEach(async (item) => {
      if (item.autoCheck && item.status === 'pending') {
        updateChecklist(item.id, 'checking')
        try {
          const result = await item.autoCheck()
          updateChecklist(item.id, result ? 'passed' : 'failed')
        } catch {
          updateChecklist(item.id, 'failed')
        }
      }
    })
  }, [])

  const updateChecklist = (id: string, status: ChecklistItem['status']) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    )
  }

  const handleStreamsReady = useCallback((stream0: MediaStream, stream1: MediaStream) => {
    stream0Ref.current = stream0
    stream1Ref.current = stream1
    setCameraReady(true)
    setMediaReady(true)
    updateChecklist('camera', 'passed')
    setAIStreams(stream0, stream1)
  }, [setAIStreams])

  const handleStreamStopped = useCallback(() => {
    stream0Ref.current = null
    stream1Ref.current = null
    setCameraReady(false)
    setMediaReady(false)
    updateChecklist('camera', 'failed')
    setAIStreams(null, null)
  }, [setAIStreams])

  const handleCameraError = useCallback(() => {
    setCameraReady(false)
    setMediaReady(false)
    updateChecklist('camera', 'failed')
  }, [])

  const startAIServerCheck = useCallback(async () => {
    updateChecklist('aiserver', 'checking')
    try {
      const url = await getAIServerUrl()
      setServerUrl(url)
      const healthy = await aiProctorService.healthCheck()
      setAiServerReady(healthy)
      updateChecklist('aiserver', healthy ? 'passed' : 'failed')
      return healthy
    } catch {
      const cached = getCachedServerUrl()
      setServerUrl(cached)
      setAiServerReady(false)
      updateChecklist('aiserver', 'failed')
      return false
    }
  }, [])

  const startCalibration = useCallback(async () => {
    if (!stream0Ref.current || !stream1Ref.current) {
      alert('Please start cameras first')
      return
    }

    if (!aiServerReady) {
      alert('AI Server is not running. Please start it first.')
      return
    }

    setCalibrationPhase(true)
    setCalibrationProgress(0)

    try {
      await aiProctorService.resetCalibration()
      
      await aiProctorService.connect(
        stream0Ref.current,
        stream1Ref.current,
        (state) => {
          setAiState(state)
          setAIProctorState(state)
          
          if (state.calibrationStatus === 'calibrating') {
            setCalibrationProgress(state.faceCount > 0 ? Math.min(100, (state.faceCount / CALIBRATION_REQUIRED_FRAMES) * 100) : 0)
          } else if (state.calibrationStatus === 'calibrated') {
            setCalibrationProgress(100)
          }
        },
        (alert) => {
          handleAIAlert(alert)
        }
      )
    } catch (err) {
      console.error('[PreCheck] AI connection failed:', err)
      alert('Failed to connect to AI server. Make sure the server is running.')
      setCalibrationPhase(false)
    }
  }, [aiServerReady, setAIProctorState, handleAIAlert])

  useEffect(() => {
    if (aiState?.calibrationStatus === 'calibrated' && calibrationPhase) {
      const timer = setTimeout(() => {
        setCalibrationPhase(false)
        aiProctorService.stop()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [aiState?.calibrationStatus, calibrationPhase])

  const stopCalibration = useCallback(() => {
    aiProctorService.stop()
    setCalibrationPhase(false)
    setAiState(null)
    setCalibrationProgress(0)
    setAIProctorState(null)
  }, [setAIProctorState])

  const systemChecksPassed = checklist
    .filter(item => item.id !== 'camera' && item.id !== 'aiserver')
    .every(item => item.status === 'passed')

  const allPassed = systemChecksPassed && cameraReady && aiServerReady && aiState?.calibrationStatus === 'calibrated' && agreed

  const handleStartExam = async () => {
    if (!cameraReady) {
      alert('Please start cameras first.')
      return
    }
    if (!aiServerReady || aiState?.calibrationStatus !== 'calibrated') {
      alert('Please connect to AI server and complete calibration.')
      return
    }

    aiProctorService.stop()

    try {
      if (window.electronAPI) {
        await window.electronAPI.exam.setKiosk(true)
        await window.electronAPI.exam.enableFullscreen()
        await window.electronAPI.exam.setPreventClose(true)
      }
      startExam()
    } catch (err) {
      console.error('[PreCheck] Failed to start exam:', err)
      alert('Failed to start exam. Please try again.')
    }
  }

  const steps = ['Cameras', 'AI Server', 'Calibrate', 'Agreement']
  const completedSteps = [
    cameraReady,
    aiServerReady,
    aiState?.calibrationStatus === 'calibrated',
    agreed,
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 border-b border-border bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <IntroLogo size={40} />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Pre-Exam Check
                </h1>
                <p className="text-xs text-muted-foreground">
                  System Requirements & AI Calibration
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded text-xs font-medium border border-border bg-secondary text-secondary-foreground">
                <span className="text-muted-foreground">Test:</span>
                <span className="ml-2 font-mono">{testId || 'N/A'}</span>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: completedSteps[index] 
                        ? '#22c55e' 
                        : index === completedSteps.findIndex(s => !s)
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--muted))',
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  >
                    {completedSteps[index] ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </motion.div>
                  <span className={cn(
                    'ml-2 text-sm font-medium hidden sm:block',
                    completedSteps[index] ? 'text-green-600' : 
                    index === completedSteps.findIndex(s => !s) ? 'text-primary' : 
                    'text-muted-foreground'
                  )}>
                    {step}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-4 rounded-full',
                    completedSteps[index] ? 'bg-green-500' : 'bg-border'
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-6 py-8"
      >
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* Left - Camera Setup */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                  <Webcam className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">
                    Dual Camera Setup
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Camera 1: Face tracking | Camera 2: Hand gesture detection
                  </p>
                </div>
              </div>

              <MultiCameraCapture
                onStreamsReady={handleStreamsReady}
                onStreamStopped={handleStreamStopped}
                onError={handleCameraError}
              />

              <div className="grid grid-cols-2 gap-4 mt-4">
                <StatusCard
                  icon={Webcam}
                  label="Face Camera"
                  status={cameraReady ? 'passed' : 'pending'}
                />
                <StatusCard
                  icon={Bot}
                  label="AI Server"
                  status={aiServerReady ? 'passed' : aiServerReady === false ? 'failed' : 'pending'}
                />
              </div>

              {aiServerReady === false && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-600">
                        AI Server Not Detected
                      </p>
                      <p className="text-xs text-red-500/80 mt-1">
                        Please start the AI server first:
                      </p>
                      <p className="text-xs mt-1">
                        <code className="bg-red-500/20 text-red-600 px-1.5 py-0.5 rounded text-[11px]">
                          ai\start_server.bat
                        </code>
                      </p>
                      {serverUrl && (
                        <p className="text-xs text-red-500/80 mt-2">
                          Server: <code className="bg-red-500/20 text-red-500 px-1 py-0.5 rounded text-[10px]">{serverUrl}</code>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">
                    AI Calibration
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Look at the screen while AI calibrates (30 frames)
                  </p>
                </div>
              </div>

              {calibrationPhase ? (
                <div className="space-y-4">
                  <div className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg border',
                    aiState?.calibrationStatus === 'calibrated'
                      ? 'bg-green-500/10 border-green-500/30 text-green-600'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                  )}>
                    <div className={cn(
                      'w-2 h-2 rounded-full animate-pulse',
                      aiState?.calibrationStatus === 'calibrated' ? 'bg-green-500' : 'bg-amber-500'
                    )} />
                    <span className="text-sm font-medium">
                      {aiState?.calibrationStatus === 'calibrated' 
                        ? 'Calibration Complete!' 
                        : aiState?.faceCount === 0 
                          ? 'No face detected - please face the camera'
                          : `Calibrating... (${Math.round(calibrationProgress)}%)`}
                    </span>
                  </div>
                  
                  <div className={cn(
                    'h-2 rounded-full overflow-hidden',
                    'bg-slate-200 dark:bg-slate-700'
                  )}>
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        aiState?.calibrationStatus === 'calibrated' ? 'bg-green-500' : 'bg-primary'
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${calibrationProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {aiState && <AIOverlay state={aiState} />}

                  <Button variant="outline" onClick={stopCalibration} className="w-full">
                    Cancel Calibration
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={startAIServerCheck}
                      variant="outline"
                      disabled={aiServerReady}
                      className="flex-1"
                    >
                      {aiServerReady ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                          Server Connected
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4 mr-2" />
                          Check AI Server
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={startCalibration}
                      disabled={!cameraReady || !aiServerReady}
                      className="flex-1"
                    >
                      <Fingerprint className="w-4 h-4 mr-2" />
                      Start Calibration
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Make sure both cameras are visible and your face is clearly visible to Camera 1
                  </p>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="space-y-3">
                {[
                  'This exam is monitored via dual cameras and AI',
                  'Do not use multiple screens during the assessment',
                  'Suspicious gestures and behaviors are detected automatically',
                  'Any violation will result in warnings (3 = disqualification)',
                ].map((rule, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">
                      {rule}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right - System Checks & Agreement */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">
                    System Checks
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Verifying your environment
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {checklist
                  .filter((item) => item.id !== 'camera' && item.id !== 'aiserver')
                  .map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border',
                          item.status === 'passed' && 'bg-green-500/5 border-green-500/20',
                          item.status === 'failed' && 'bg-red-500/5 border-red-500/20',
                          item.status === 'checking' && 'bg-primary/5 border-primary/20',
                          item.status === 'pending' && 'bg-muted border-border'
                        )}
                      >
                        {item.status === 'checking' ? (
                          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : item.status === 'passed' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : item.status === 'failed' ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">
                            {item.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <label className={cn(
                'flex items-start gap-3 p-4 rounded-lg cursor-pointer border transition-colors',
                agreed 
                  ? 'bg-primary/5 border-primary/30' 
                  : 'bg-muted border-border hover:border-primary/30'
              )}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 rounded border-primary text-primary focus:ring-primary mt-0.5"
                />
                <span className="text-sm font-medium text-foreground">
                  I agree to the exam rules and consent to AI-powered proctoring
                </span>
              </label>
            </div>

            <Button
              size="lg"
              className="w-full h-12 text-sm font-medium"
              disabled={!allPassed}
              onClick={handleStartExam}
            >
              {allPassed ? (
                <>
                  Begin Assessment
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Complete All Checks
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

function StatusCard({ 
  icon: Icon, 
  label, 
  status, 
}: { 
  icon: React.ElementType
  label: string
  status: 'pending' | 'passed' | 'failed'
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border',
        status === 'passed' && 'bg-green-500/5 border-green-500/20',
        status === 'failed' && 'bg-red-500/5 border-red-500/20',
        status === 'pending' && 'bg-muted border-border'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center',
        status === 'passed' && 'bg-green-500/10',
        status === 'failed' && 'bg-red-500/10',
        status === 'pending' && 'bg-muted'
      )}>
        {status === 'passed' ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : status === 'failed' ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <Icon className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div>
        <p className="font-medium text-sm text-foreground">{label}</p>
        <p className={cn('text-xs',
          status === 'passed' && 'text-green-600',
          status === 'failed' && 'text-red-600',
          status === 'pending' && 'text-muted-foreground'
        )}>
          {status === 'passed' ? 'Ready' : status === 'failed' ? 'Failed' : 'Not detected'}
        </p>
      </div>
    </div>
  )
}
