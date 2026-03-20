import React, { useState } from 'react'
import { cn } from '@/renderer/lib/utils'
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react'

export interface Warning {
  id: string
  type: 'minor' | 'major' | 'critical'
  message: string
  timestamp: Date
}

interface WarningBannerProps {
  warnings: Warning[]
  maxVisible?: number
  onDismiss?: (id: string) => void
  className?: string
}

export function WarningBanner({
  warnings,
  maxVisible = 2,
  onDismiss,
  className,
}: WarningBannerProps) {
  const [expanded, setExpanded] = useState(false)

  const typeStyles = {
    minor: {
      bg: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-400',
      icon: AlertTriangle,
    },
    major: {
      bg: 'bg-orange-500/10 border-orange-500/30',
      text: 'text-orange-400',
      icon: AlertTriangle,
    },
    critical: {
      bg: 'bg-red-500/10 border-red-500/30',
      text: 'text-red-400',
      icon: AlertTriangle,
    },
  }

  const maxExpanded = 10
  const visibleWarnings = warnings.slice(0, expanded ? maxExpanded : maxVisible)
  const hiddenCount = Math.max(0, warnings.length - (expanded ? maxExpanded : maxVisible))

  if (warnings.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
        {visibleWarnings.map((warning) => {
          const style = typeStyles[warning.type]
          const Icon = style.icon
          return (
            <div
              key={warning.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg animate-in slide-in-from-top',
                style.bg,
                style.text
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{warning.message}</p>
                <p className="text-xs opacity-60">
                  {warning.timestamp.toLocaleTimeString()}
                </p>
              </div>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(warning.id)}
                  className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-sm font-medium text-slate-400 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show All ({warnings.length} warnings)
            </>
          )}
        </button>
      )}
    </div>
  )
}
