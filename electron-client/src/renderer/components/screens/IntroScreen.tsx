import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IntroLogo } from '@/renderer/components/ui/IntroLogo'
import { useTheme } from '@/renderer/hooks/useTheme'

interface IntroScreenProps {
  onComplete: () => void
  duration?: number
}

export function IntroScreen({ onComplete, duration = 3000 }: IntroScreenProps) {
  const [isComplete, setIsComplete] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    // Start content fade in after logo animation starts
    const contentTimer = setTimeout(() => {
      setShowContent(true)
    }, 1600)

    // Start loading indicator
    const loadingTimer = setTimeout(() => {
      setShowLoading(true)
    }, 2400)

    // Complete and transition
    const completeTimer = setTimeout(() => {
      setIsComplete(true)
      setTimeout(onComplete, 400)
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
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Logo Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative"
          >
            <IntroLogo size={180} animated={true} />
          </motion.div>

          {/* Text Content */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                className="text-center mt-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
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

          {/* Loading Indicator */}
          <AnimatePresence>
            {showLoading && (
              <motion.div
                className={`absolute bottom-16 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}
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

          {/* Progress Bar */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-[#032D91] to-[#1488DB]"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: duration / 1000 - 0.5, ease: 'linear' }}
            />
          </motion.div>

          {/* Subtle Grid Background */}
          <div 
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              backgroundImage: theme === 'dark' 
                ? 'linear-gradient(rgba(3, 45, 145, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(3, 45, 145, 0.03) 1px, transparent 1px)'
                : 'linear-gradient(rgba(3, 45, 145, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(3, 45, 145, 0.02) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
