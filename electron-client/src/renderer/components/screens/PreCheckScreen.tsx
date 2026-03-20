import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/renderer/components/ui/button'
import { MediaCapture } from '@/renderer/components/proctoring/MediaCapture'
import { useExamStore } from '@/renderer/store/examStore'
import { IntroLogo } from '@/renderer/components/ui/IntroLogo'
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
import { useTheme } from '@/renderer/hooks/useTheme'

interface ChecklistItem {
  id: string
  label: string
  description: string
  icon: React.ElementType
  status: 'pending' | 'checking' | 'passed' | 'failed'
  autoCheck?: () => Promise<boolean>
}

export function PreCheckScreen() {
  const { testId, startExam } = useExamStore()
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const { theme } = useTheme()
  
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
  const currentStep = completedSteps.findIndex(s => !s)

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
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <IntroLogo size={40} />
              <div>
                <h1 className={cn(
                  "text-lg font-semibold",
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                )}>
                  Pre-Exam Check
                </h1>
                <p className={cn(
                  "text-xs",
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                )}>
                  System Requirements
                </p>
              </div>
            </div>
            
            <div className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border",
              theme === 'dark' 
                ? 'bg-secondary text-slate-300 border-border' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}>
              <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>Test:</span>
              <span className="ml-2 font-mono">{testId || 'N/A'}</span>
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
                        : currentStep === index 
                          ? 'hsl(var(--primary))'
                          : theme === 'dark' ? '#334155' : '#e2e8f0',
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-colors"
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
                    currentStep === index ? 'text-primary' : 
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  )}>
                    {step}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-4 rounded-full',
                    completedSteps[index] ? 'bg-green-500' : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Left - Media Capture */}
          <div>
            <div className={cn(
              "rounded-xl border p-6 h-full",
              theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'
            )}>
              <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'
                )}>
                  <Webcam className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className={cn(
                    "font-semibold",
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  )}>
                    Camera & Microphone
                  </h2>
                  <p className={cn(
                    "text-sm",
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  )}>
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

              {/* Status indicators */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <StatusCard
                  icon={Webcam}
                  label="Camera"
                  ready={cameraReady}
                  theme={theme}
                />
                <StatusCard
                  icon={Mic}
                  label="Microphone"
                  ready={micReady}
                  theme={theme}
                />
              </div>
            </div>
          </div>

          {/* Right - Checks & Agreement */}
          <div className="space-y-6">
            {/* System Checks */}
            <div className={cn(
              "rounded-xl border p-6",
              theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'
            )}>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'
                )}>
                  <Fingerprint className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className={cn(
                    "font-semibold",
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  )}>
                    System Checks
                  </h2>
                  <p className={cn(
                    "text-sm",
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  )}>
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
                          'flex items-center gap-4 p-4 rounded-lg border transition-all',
                          item.status === 'passed' && theme === 'dark' ? 'bg-green-500/5 border-green-500/20' :
                          item.status === 'passed' && theme === 'light' ? 'bg-green-50 border-green-200' :
                          item.status === 'failed' && theme === 'dark' ? 'bg-red-500/5 border-red-500/20' :
                          item.status === 'failed' && theme === 'light' ? 'bg-red-50 border-red-200' :
                          item.status === 'checking' ? 'bg-primary/5 border-primary/20' :
                          theme === 'dark' ? 'bg-secondary/50 border-border' : 'bg-slate-50 border-slate-200'
                        )}
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          item.status === 'passed' && 'bg-green-500/10',
                          item.status === 'failed' && 'bg-red-500/10',
                          item.status === 'checking' && 'bg-primary/10',
                          item.status === 'pending' && theme === 'dark' ? 'bg-secondary' : 'bg-slate-100'
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
                            <Icon className={cn(
                              "w-5 h-5",
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                            )} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "font-medium text-sm",
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          )}>
                            {item.label}
                          </p>
                          <p className={cn(
                            "text-xs",
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                          )}>
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
            </div>

            {/* Agreement */}
            <div className={cn(
              "rounded-xl border p-6",
              theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'
            )}>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'
                )}>
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className={cn(
                    "font-semibold",
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  )}>
                    Exam Agreement
                  </h2>
                  <p className={cn(
                    "text-sm",
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  )}>
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
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg",
                      theme === 'dark' ? 'bg-secondary/30' : 'bg-slate-50'
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className={cn(
                      "text-sm",
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    )}>
                      {rule}
                    </span>
                  </div>
                ))}
              </div>

              <label className={cn(
                'flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all border',
                agreed 
                  ? 'bg-primary/5 border-primary/30' 
                  : theme === 'dark' ? 'bg-secondary/30 border-border hover:border-primary/30' : 'bg-slate-50 border-slate-200 hover:border-primary/30'
              )}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 rounded border-primary text-primary focus:ring-primary"
                />
                <span className={cn(
                  "text-sm font-medium",
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                )}>
                  I agree to the exam rules and consent to proctoring
                </span>
              </label>
            </div>

            {/* Start Button */}
            <Button
              size="lg"
              className={cn(
                'w-full h-12 text-sm font-medium',
                !allPassed && 'opacity-50 cursor-not-allowed'
              )}
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
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusCard({ 
  icon: Icon, 
  label, 
  ready, 
  theme 
}: { 
  icon: React.ElementType
  label: string
  ready: boolean
  theme: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border transition-all',
        ready 
          ? theme === 'dark' ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200' 
          : theme === 'dark' ? 'bg-secondary/50 border-border' : 'bg-slate-50 border-slate-200'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center',
        ready 
          ? 'bg-primary' 
          : theme === 'dark' ? 'bg-secondary' : 'bg-slate-100'
      )}>
        <Icon className={cn('w-5 h-5', ready ? 'text-white' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
      </div>
      <div>
        <p className={cn(
          "font-medium text-sm",
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        )}>
          {label}
        </p>
        <p className={cn(
          "text-xs",
          ready 
            ? 'text-green-600' 
            : theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
        )}>
          {ready ? 'Ready' : 'Not detected'}
        </p>
      </div>
      {ready && (
        <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
      )}
    </div>
  )
}
