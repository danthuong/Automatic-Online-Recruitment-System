import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, Transition } from 'framer-motion'
import { IntroLogo } from '@/renderer/components/ui/IntroLogo'
import { useTheme } from '@/renderer/hooks/useTheme'

interface IntroScreenProps {
  onComplete: () => void
  duration?: number
}

// Asian-inspired transition - slow, elegant, no bounce
const asianTransition: Transition = {
  duration: 0.6,
  ease: [0.22, 0.61, 0.36, 1] as const // Fabric easing
}

const inkSpreadTransition: Transition = {
  duration: 0.8,
  ease: [0.4, 0, 0.2, 1] as const // Asian easing
}

const slideInTransition: Transition = {
  duration: 0.5,
  ease: [0.4, 0, 0.2, 1] as const
}

export function IntroScreen({ onComplete, duration = 3000 }: IntroScreenProps) {
  const [isComplete, setIsComplete] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    // Start content fade in after logo animation starts (slower)
    const contentTimer = setTimeout(() => {
      setShowContent(true)
    }, 1500)

    // Start loading indicator (slower)
    const loadingTimer = setTimeout(() => {
      setShowLoading(true)
    }, 2200)

    // Complete and transition
    const completeTimer = setTimeout(() => {
      setIsComplete(true)
      setTimeout(onComplete, 500) // Slightly longer transition
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
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${
            theme === 'dark' 
              ? 'bg-[#060a12]' 
              : 'bg-[#f8fafc]'
          }`}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Logo Animation - Ink spread effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={inkSpreadTransition}
            className="relative"
          >
            <IntroLogo size={180} animated={true} />
          </motion.div>

          {/* Text Content - Fabric unfold effect */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                className="text-center mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={asianTransition}
              >
                <h1 className={`text-2xl font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  HCMUT Recruitment System
                </h1>
                <p className={`mt-2 text-sm ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Automated Online Assessment Platform
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Indicator - Gentle slide in */}
          <AnimatePresence>
            {showLoading && (
              <motion.div
                className={`absolute bottom-16 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={slideInTransition}
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

          {/* Progress Bar - Gentle */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="h-full progress-gradient"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ 
                duration: duration / 1000 - 0.5, 
                ease: [0.4, 0, 0.6, 1] // Gentle easing
              }}
            />
          </motion.div>

          {/* Subtle Grid Background - Very understated */}
          <div 
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              backgroundImage: theme === 'dark' 
                ? 'radial-gradient(circle at 50% 50%, rgba(3, 45, 145, 0.03) 0%, transparent 70%)'
                : 'radial-gradient(circle at 50% 50%, rgba(3, 45, 145, 0.02) 0%, transparent 70%)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
