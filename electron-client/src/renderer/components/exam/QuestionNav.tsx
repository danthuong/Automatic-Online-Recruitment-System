import React from 'react'
import { cn } from '@/renderer/lib/utils'

interface QuestionNavProps {
  questions: Array<{
    id: string
    type: 'mcq' | 'code' | 'essay'
  }>
  currentIndex: number
  answered: Set<string>
  flagged: Set<string>
  onNavigate: (index: number) => void
  onToggleFlag: (id: string) => void
  className?: string
}

export function QuestionNav({
  questions,
  currentIndex,
  answered,
  flagged,
  onNavigate,
  onToggleFlag,
  className,
}: QuestionNavProps) {
  const getStatus = (question: typeof questions[0], index: number) => {
    const isCurrent = index === currentIndex
    const isAnswered = answered.has(question.id)
    const isFlagged = flagged.has(question.id)

    if (isCurrent) return 'current'
    if (isFlagged) return 'flagged'
    if (isAnswered) return 'answered'
    return 'unanswered'
  }

  const statusStyles = {
    current: 'bg-primary text-white ring-2 ring-primary',
    answered: 'bg-slate-700 text-white',
    unanswered: 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:border-primary/30',
    flagged: 'bg-amber-500 text-white',
  }

  const typeIcons = {
    mcq: 'MC',
    code: '</>',
    essay: 'T',
  }

  return (
    <div className={cn('p-4 space-y-4', className)}>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
          Questions
        </h3>
        <div className="grid grid-cols-6 gap-2">
          {questions.map((question, index) => {
            const status = getStatus(question, index)
            return (
              <button
                key={question.id}
                onClick={() => onNavigate(index)}
                className={cn(
                  'relative aspect-square rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg',
                  statusStyles[status]
                )}
                title={`Question ${index + 1} (${question.type})`}
              >
                {index + 1}
                {flagged.has(question.id) && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-400 rounded-full animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
          Legend
        </h3>
        <div className="space-y-1 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className={cn('h-4 w-4 rounded', statusStyles.answered)} />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('h-4 w-4 rounded border', statusStyles.unanswered)} />
            <span>Not answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('h-4 w-4 rounded', statusStyles.flagged)} />
            <span>Flagged for review</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('h-4 w-4 rounded shadow-lg', statusStyles.current)} />
            <span>Current</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
          Question Types
        </h3>
        <div className="space-y-1 text-xs">
          {Object.entries(typeIcons).map(( [type, label]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-primary text-white flex items-center justify-center text-[8px]">
                {label}
              </div>
              <span className="text-slate-400 capitalize">{type === 'mcq' ? 'Multiple Choice' : type === 'code' ? 'Code' : 'Essay'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
