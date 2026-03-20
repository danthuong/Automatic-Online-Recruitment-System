import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/renderer/components/ui/button'
import { MediaCapture } from '@/renderer/components/proctoring/MediaCapture'
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
} from 'lucide-react'

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
      ease: 'easeOut',
    },
  },
}

export function PreCheckScreen() {
  const { testId, startExam } = useExamStore()
  const mediaStreamRef = useRef<MediaStream | null>(null)
  
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { 
      id: 'camera', 
      label: 'Camera Access', 
      description: 'Webcam must be enabled for proctoring',
      icon: Webcam, 
      status: 'pending',
    },
    { 
      id: 'microphone', 
      label: 'Microphone Access', 
      description: 'Microphone for voice monitoring',
      icon: Mic, 
      status: 'pending',
    },
    { 
      id: 'network', 
      label: 'Network Connection', 
      description: 'Stable internet for real-time monitoring',
      icon: Wifi, 
      status: 'pending',
      autoCheck: async () => {
        try {
          await fetch('https://www.google.com/favicon.ico', { 
            mode: 'no-cors',
            cache: 'no-store' 
          })
          return true
        } catch {
          return false
        }
      }
    },
    { 
      id: 'display', 
      label: 'Display Settings', 
      description: 'Minimum 1024px resolution required',
      icon: Monitor, 
      status: 'pending',
      autoCheck: async () => {
        if (window.electronAPI) {
          try {
            const bounds = await window.electronAPI.exam.getWindowBounds()
            return bounds && bounds.width >= 1024
          } catch {
            return window.innerWidth >= 1024
          }
        }
        return window.innerWidth >= 1024
      }
    },
  ])
  
  const [agreed, setAgreed] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [micReady, setMicReady] = useState(false)

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

  const handleStreamReady = (stream: MediaStream) => {
    mediaStreamRef.current = stream
    const hasVideo = stream.getVideoTracks().length > 0
    const hasAudio = stream.getAudioTracks().length > 0
    setCameraReady(hasVideo)
    setMicReady(hasAudio)
    setMediaReady(hasVideo && hasAudio)
    if (hasVideo) updateChecklist('camera', 'passed')
    if (hasAudio) updateChecklist('microphone', 'passed')
  }

  const handleStreamStopped = () => {
    mediaStreamRef.current = null
    setMediaReady(false)
    setCameraReady(false)
    setMicReady(false)
    updateChecklist('camera', 'failed')
    updateChecklist('microphone', 'failed')
  }

  const handleError = () => {
    setMediaReady(false)
    setCameraReady(false)
    setMicReady(false)
    updateChecklist('camera', 'failed')
    updateChecklist('microphone', 'failed')
  }

  const systemChecksPassed = checklist
    .filter(item => item.id !== 'camera' && item.id !== 'microphone')
    .every(item => item.status === 'passed')

  const allPassed = systemChecksPassed && cameraReady && micReady && agreed

  const handleStartExam = async () => {
    if (!cameraReady || !micReady) {
      alert('Please enable both camera and microphone to continue.')
      return
    }
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

  const steps = ['Camera & Mic', 'System Check', 'Agreement', 'Ready']
  const completedSteps = [
    cameraReady && micReady,
    systemChecksPassed,
    agreed,
    allPassed,
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <IntroLogo size={40} />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Pre-Exam Check
                </h1>
                <p className="text-xs text-muted-foreground">
                  System Requirements
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

          {/* Progress Steps */}
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

      {/* Main Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-6 py-8"
      >
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Left - Media Capture */}
          <motion.div variants={itemVariants}>
            <div className="bg-card border border-border rounded-lg p-6 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                  <Webcam className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">
                    Camera & Microphone
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Required for proctoring
                  </p>
                </div>
              </div>

              <MediaCapture
                onStreamReady={handleStreamReady}
                onStreamUpdate={handleStreamReady}
                onStreamStopped={handleStreamStopped}
                onError={handleError}
              />

              <div className="grid grid-cols-2 gap-4 mt-6">
                <StatusCard
                  icon={Webcam}
                  label="Camera"
                  ready={cameraReady}
                />
                <StatusCard
                  icon={Mic}
                  label="Microphone"
                  ready={micReady}
                />
              </div>
            </div>
          </motion.div>

          {/* Right - Checks & Agreement */}
          <div className="space-y-6">
            {/* System Checks */}
            <motion.div variants={itemVariants} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                  <Fingerprint className="w-5 h-5 text-primary" />
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
                  .filter((item) => item.id !== 'camera' && item.id !== 'microphone')
                  .map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-lg border',
                          item.status === 'passed' && 'bg-green-500/5 border-green-500/20',
                          item.status === 'failed' && 'bg-red-500/5 border-red-500/20',
                          item.status === 'checking' && 'bg-primary/5 border-primary/20',
                          item.status === 'pending' && 'bg-muted border-border'
                        )}
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          item.status === 'passed' && 'bg-green-500/10',
                          item.status === 'failed' && 'bg-red-500/10',
                          item.status === 'checking' && 'bg-primary/10',
                          item.status === 'pending' && 'bg-muted'
                        )}>
                          {item.status === 'checking' ? (
                            <motion.div
                              className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                          ) : item.status === 'passed' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : item.status === 'failed' ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Icon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">
                            {item.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        {item.status === 'passed' && (
                          <span className="text-xs font-medium text-green-600">Ready</span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-xs font-medium text-red-600">Failed</span>
                        )}
                      </div>
                    )
                  })}
              </div>
            </motion.div>

            {/* Agreement */}
            <motion.div variants={itemVariants} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">
                    Exam Agreement
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Please read and accept
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  'This exam is monitored via webcam and microphone',
                  'Do not leave the exam window during the assessment',
                  'Any suspicious behavior will be recorded (3 warnings = disqualification)',
                  'All activities are logged for review',
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

              <label className={cn(
                'flex items-center gap-4 p-4 rounded-lg cursor-pointer border transition-colors',
                agreed 
                  ? 'bg-primary/5 border-primary/30' 
                  : 'bg-muted border-border hover:border-primary/30'
              )}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 rounded border-primary text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  I agree to the exam rules and consent to proctoring
                </span>
              </label>
            </motion.div>

            {/* Start Button */}
            <motion.div variants={itemVariants}>
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
        </div>
      </motion.div>
    </div>
  )
}

function StatusCard({ 
  icon: Icon, 
  label, 
  ready, 
}: { 
  icon: React.ElementType
  label: string
  ready: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border',
        ready 
          ? 'bg-green-500/5 border-green-500/20' 
          : 'bg-muted border-border'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center',
        ready 
          ? 'bg-primary' 
          : 'bg-muted'
      )}>
        <Icon className={cn('w-5 h-5', ready ? 'text-white' : 'text-muted-foreground')} />
      </div>
      <div>
        <p className="font-medium text-sm text-foreground">{label}</p>
        <p className={cn('text-xs', ready ? 'text-green-600' : 'text-muted-foreground')}>
          {ready ? 'Ready' : 'Not detected'}
        </p>
      </div>
    </div>
  )
}
