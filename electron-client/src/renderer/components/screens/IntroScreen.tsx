import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, Transition } from 'framer-motion'
import { IntroLogo } from '@/renderer/components/ui/IntroLogo'
import { useTheme } from '@/renderer/hooks/useTheme'

interface IntroScreenProps {
  onComplete: () => void
  duration?: number
}

// Asian-inspired transitions - slow, elegant, no bounce
const fabricEasing: Transition = {
  duration: 0.6,
  ease: [0.22, 0.61, 0.36, 1] as const
}

const inkEasing: Transition = {
  duration: 0.8,
  ease: [0.4, 0, 0.2, 1] as const
}

const gentleEasing: Transition = {
  duration: 0.5,
  ease: [0.4, 0, 0.2, 1] as const
}

export function IntroScreen({ onComplete, duration = 3000 }: IntroScreenProps) {
  const [isComplete, setIsComplete] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    const contentTimer = setTimeout(() => {
      setShowContent(true)
    }, 1500)

    const loadingTimer = setTimeout(() => {
      setShowLoading(true)
    }, 2200)

    const completeTimer = setTimeout(() => {
      setIsComplete(true)
      setTimeout(onComplete, 600)
    }, duration)

    return () => {
      clearTimeout(contentTimer)
      clearTimeout(loadingTimer)
      clearTimeout(completeTimer)
    }
  }, [duration, onComplete])

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Logo - Ink spread effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={inkEasing}
            className="relative"
          >
            <IntroLogo size={160} animated={true} />
          </motion.div>

          {/* Text Content - Fabric unfold effect */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                className="text-center mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={fabricEasing}
              >
                <h1 className="text-2xl font-semibold text-foreground">
                  HCMUT Recruitment System
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Automated Online Assessment Platform
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Indicator - Gentle slide in */}
          <AnimatePresence>
            {showLoading && (
              <motion.div
                className="absolute bottom-16 text-muted-foreground"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={gentleEasing}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">Preparing your environment</span>
                  <div className="loading-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Bar - Asian minimal */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="h-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ 
                duration: duration / 1000 - 0.5, 
                ease: [0.4, 0, 0.6, 1]
              }}
            />
          </motion.div>

          {/* Subtle Background Pattern */}
          <div 
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              backgroundImage: theme === 'dark' 
                ? 'radial-gradient(circle at 50% 50%, rgba(3, 45, 145, 0.05) 0%, transparent 60%)'
                : 'radial-gradient(circle at 50% 50%, rgba(3, 45, 145, 0.03) 0%, transparent 60%)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
