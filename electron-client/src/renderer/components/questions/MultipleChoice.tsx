import React from 'react'
import { RadioGroup, RadioGroupItem } from '@/renderer/components/ui/radio-group'
import { Card, CardContent } from '@/renderer/components/ui/card'
import { cn } from '@/renderer/lib/utils'

interface Option {
  id: string
  text: string
}

interface MultipleChoiceProps {
  question: string
  options: Option[]
  selectedId?: string
  onSelect: (id: string) => void
  className?: string
}

export function MultipleChoice({
  question,
  options,
  selectedId,
  onSelect,
  className,
}: MultipleChoiceProps) {
  return (
    <Card className={cn('transition-all duration-200 glass-panel', className)}>
      <CardContent className="pt-6 bg-slate-800/30 backdrop-blur-sm">
        <p className="text-lg font-medium mb-6 leading-relaxed text-slate-200">{question}</p>
        <RadioGroup value={selectedId} onValueChange={onSelect} className="space-y-3">
          {options.map((option, index) => {
            const letter = String.fromCharCode(65 + index)
            const isSelected = selectedId === option.id
            return (
              <label
                key={option.id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 backdrop-blur-sm',
                  'hover:border-primary/50 hover:bg-primary/5',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                    : 'border-slate-700/50 bg-slate-800/30'
                )}
              >
                <RadioGroupItem value={option.id} className="mt-1" />
                <span className={cn(
                  'flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold transition-all',
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-slate-700 text-slate-300'
                )}>
                  {letter}
                </span>
                <span className="text-base leading-relaxed text-slate-200">{option.text}</span>
              </label>
            )
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
