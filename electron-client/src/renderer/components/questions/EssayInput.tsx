import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/renderer/components/ui/card'
import { cn } from '@/renderer/lib/utils'
import { FileText } from 'lucide-react'

interface EssayInputProps {
  question: string
  value: string
  onChange: (value: string) => void
  minWords?: number
  maxWords?: number
  placeholder?: string
  className?: string
}

export function EssayInput({
  question,
  value,
  onChange,
  minWords = 0,
  maxWords = 1000,
  placeholder = 'Start typing your answer here...',
  className,
}: EssayInputProps) {
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    const words = value.trim() ? value.trim().split(/\s+/).length : 0
    setWordCount(words)
  }, [value])

  const charCount = value.length
  const progress = Math.min((wordCount / maxWords) * 100, 100)
  const isUnderMin = wordCount < minWords
  const isOverMax = wordCount > maxWords

  return (
    <Card className={cn('overflow-hidden glass-panel', className)}>
      <CardHeader className="pb-4 bg-slate-800/30 backdrop-blur-sm">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Essay Question
        </CardTitle>
        <CardDescription>{question}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-slate-900/50">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              'w-full min-h-[300px] p-6 text-base leading-relaxed resize-none',
              'bg-transparent border-0 focus:ring-0 focus:outline-none focus:border-none',
              'placeholder:text-slate-600 text-slate-200',
              'dark:placeholder:text-slate-600 dark:text-slate-200'
            )}
          />
        </div>
        <div className="px-6 py-4 bg-slate-800/30 backdrop-blur-sm border-t border-slate-700/30 space-y-2">
          <div className="h-1.5 w-full rounded-full bg-slate-700/50 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300 shadow-lg',
                isOverMax ? 'bg-red-500 shadow-red-500/30' : progress > 80 ? 'bg-amber-500 shadow-amber-500/30' : 'bg-primary shadow-primary/30'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-4 text-slate-400">
              <span>
                Words:{' '}
                <span className={cn('font-medium', isUnderMin && 'text-amber-400', isOverMax && 'text-red-400')}>
                  {wordCount}
                </span>
                {minWords > 0 && (
                  <span className="text-xs ml-1 text-slate-500">(min: {minWords})</span>
                )}
              </span>
              <span>Characters: {charCount}</span>
            </div>
            {maxWords > 0 && (
              <span className="text-slate-400">
                {maxWords - wordCount < 0
                  ? `${Math.abs(maxWords - wordCount)} over limit`
                  : `${maxWords - wordCount} remaining`}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
