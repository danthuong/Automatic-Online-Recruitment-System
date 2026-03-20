import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/renderer/lib/utils'
import { useTheme } from '@/renderer/hooks/useTheme'
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock,
} from 'lucide-react'

interface FeedbackPanelProps {
  score?: number
  correctAnswers?: number
  totalQuestions?: number
  averageTime?: number
  className?: string
}

export function FeedbackPanel({
  score = 0,
  correctAnswers = 0,
  totalQuestions = 3,
  averageTime = 0,
  className
}: FeedbackPanelProps) {
  const { theme } = useTheme()
  
  const stats = [
    {
      label: 'Score',
      value: score,
      max: 100,
      suffix: '%',
      icon: TrendingUp,
    },
    {
      label: 'Correct',
      value: correctAnswers,
      max: totalQuestions,
      suffix: '',
      icon: CheckCircle2,
    },
    {
      label: 'Avg Time',
      value: averageTime,
      max: 60,
      suffix: 's',
      icon: Clock,
    },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => {
          const percentage = Math.min((stat.value / stat.max) * 100, 100)
          const Icon = stat.icon
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'p-3 rounded-lg border',
                theme === 'dark' 
                  ? 'bg-card border-border' 
                  : 'bg-white border-slate-200'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn(
                  "w-4 h-4",
                  theme === 'dark' ? 'text-primary' : 'text-primary'
                )} />
                <span className={cn(
                  "text-xs",
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                )}>
                  {stat.label}
                </span>
              </div>
              
              <div className={cn(
                "text-2xl font-semibold mb-2",
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {stat.value}{stat.suffix}
              </div>

              <div className={cn(
                "h-1 rounded-full overflow-hidden",
                theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
              )}>
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    theme === 'dark' ? 'bg-primary' : 'bg-primary'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
