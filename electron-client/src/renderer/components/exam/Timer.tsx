import React, { useState, useEffect, useCallback } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'

interface TimerProps {
  initialTime: number
  onTimeUp?: () => void
  warningThreshold?: number
  criticalThreshold?: number
  onTick?: (remaining: number) => void
  className?: string
}

export function Timer({
  initialTime,
  onTimeUp,
  warningThreshold = 300,
  criticalThreshold = 60,
  onTick,
  className,
}: TimerProps) {
  const [remaining, setRemaining] = useState(initialTime)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onTimeUp?.()
          return 0
        }
        const newTime = prev - 1
        onTick?.(newTime)
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [onTimeUp, onTick])

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  const isWarning = remaining <= warningThreshold && remaining > criticalThreshold
  const isCritical = remaining <= criticalThreshold

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-semibold transition-all duration-300',
        'border backdrop-blur-sm',
        isCritical && 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse shadow-lg shadow-red-500/20',
        isWarning && 'bg-amber-500/20 border-amber-500/50 text-amber-400',
        !isWarning && !isCritical && 'bg-primary/10 border-primary/30 text-primary',
        className
      )}
    >
      {isCritical ? (
        <AlertTriangle className="h-5 w-5" />
      ) : (
        <Clock className="h-5 w-5" />
      )}
      <span>{formatTime(remaining)}</span>
    </div>
  )
}
