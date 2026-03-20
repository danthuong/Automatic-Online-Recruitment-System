import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IntroLogo } from '@/renderer/components/ui/IntroLogo'

interface IntroScreenProps {
  onComplete: () => void
  duration?: number
}

export function IntroScreen({ onComplete, duration = 3000 }: IntroScreenProps) {
  const [isComplete, setIsComplete] = useState(false)
  const [showText, setShowText] = useState(false)
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    const textTimer = setTimeout(() => {
      setShowText(true)
    }, 1200)

    const loadingTimer = setTimeout(() => {
      setShowLoading(true)
    }, 1800)

    const completeTimer = setTimeout(() => {
      setIsComplete(true)
      setTimeout(onComplete, 400)
    }, duration)

    return () => {
      clearTimeout(textTimer)
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
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Logo - Stroke drawing animation */}
          <motion.div
            initial={{ opacity: 1 }}
            className="relative"
          >
            <IntroLogo size={140} animated={true} />
          </motion.div>

          {/* Text Content - Slow fade in */}
          <AnimatePresence>
            {showText && (
              <motion.div
                className="text-center mt-8"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
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

          {/* Loading Indicator */}
          <AnimatePresence>
            {showLoading && (
              <motion.div
                className="absolute bottom-16 text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
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

          {/* Clean Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ 
                duration: duration / 1000, 
                ease: 'linear' 
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
