import React from 'react'
import { Progress } from '@/renderer/components/ui/progress'
import { cn } from '@/renderer/lib/utils'

interface ExamProgressProps {
  current: number
  total: number
  answered: number[]
  className?: string
}

export function ExamProgress({ current, total, answered, className }: ExamProgressProps) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          Question {current} of {total}
        </span>
        <span className="font-medium text-primary">{percentage}% Complete</span>
      </div>
      <Progress value={percentage} className="h-2 bg-slate-800/50" indicatorClassName="bg-gradient-to-r from-primary to-pink-500 shadow-lg shadow-primary/30" />
      <div className="flex gap-1 text-xs text-slate-500">
        <span>{answered.length} answered</span>
        <span className="mx-2">|</span>
        <span>{total - answered.length} remaining</span>
      </div>
    </div>
  )
}
