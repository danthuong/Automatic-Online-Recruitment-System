import React from 'react'
import { cn } from '@/renderer/lib/utils'
import { Clock, AlertTriangle, Eye, MousePointer, Keyboard, Monitor, Play, Pause, Flag } from 'lucide-react'

export interface TimelineEvent {
  id: string
  timestamp: Date
  type: 'start' | 'blur' | 'focus' | 'paste' | 'keystroke' | 'devtools' | 'process' | 'warning' | 'idle' | 'submit'
  title: string
  details: string
  severity?: 'info' | 'warning' | 'critical'
}

interface TimelineProps {
  events: TimelineEvent[]
  startTime: Date
  endTime?: Date
  className?: string
}

export function Timeline({ events, startTime, endTime, className }: TimelineProps) {
  const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'start':
        return <Play className="h-4 w-4" />
      case 'blur':
        return <Eye className="h-4 w-4 rotate-180" />
      case 'focus':
        return <Eye className="h-4 w-4" />
      case 'paste':
        return <MousePointer className="h-4 w-4" />
      case 'keystroke':
        return <Keyboard className="h-4 w-4" />
      case 'devtools':
        return <Monitor className="h-4 w-4" />
      case 'process':
        return <AlertTriangle className="h-4 w-4" />
      case 'warning':
        return <Flag className="h-4 w-4" />
      case 'idle':
        return <Clock className="h-4 w-4" />
      case 'submit':
        return <Pause className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getEventColor = (event: TimelineEvent) => {
    if (event.severity === 'critical') return 'bg-red-500/10 text-red-400 border-red-500/30'
    if (event.severity === 'warning') return 'bg-amber-500/10 text-amber-400 border-amber-500/30'

    switch (event.type) {
      case 'blur':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
      case 'paste':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      case 'devtools':
      case 'process':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      case 'warning':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      case 'idle':
        return 'bg-slate-800/50 text-slate-400 border-slate-700/50'
      case 'start':
      case 'submit':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      default:
        return 'bg-slate-800/50 text-slate-400 border-slate-700/50'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const diff = timestamp.getTime() - startTime.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const getDuration = (event: TimelineEvent, nextEvent?: TimelineEvent) => {
    if (!nextEvent) return null
    const duration = nextEvent.timestamp.getTime() - event.timestamp.getTime()
    if (duration < 1000) return null
    return `${(duration / 1000).toFixed(1)}s`
  }

  const warningCount = events.filter(e => e.severity === 'warning' || e.severity === 'critical').length
  const blurCount = events.filter(e => e.type === 'blur').length
  const pasteCount = events.filter(e => e.type === 'paste').length

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">Activity Timeline</h3>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-orange-400">
            <Eye className="h-4 w-4" /> {blurCount} focus losses
          </span>
          <span className="flex items-center gap-1 text-blue-400">
            <MousePointer className="h-4 w-4" /> {pasteCount} pastes
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <AlertTriangle className="h-4 w-4" /> {warningCount} warnings
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-primary to-slate-700" />

        <div className="space-y-4">
          {sortedEvents.map((event, index) => {
            const nextEvent = sortedEvents[index + 1]
            const duration = getDuration(event, nextEvent)

            return (
              <div key={event.id} className="relative flex gap-4 animate-in slide-in-from-left">
                <div className={cn(
                  'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 backdrop-blur-sm shadow-lg',
                  getEventColor(event)
                )}>
                  {getEventIcon(event.type)}
                </div>

                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-500">
                      {formatTimestamp(event.timestamp)}
                    </span>
                    {duration && (
                      <span className="text-xs text-slate-500">
                        ({duration})
                      </span>
                    )}
                    <h4 className="font-medium text-slate-300">{event.title}</h4>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{event.details}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {sortedEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Clock className="h-12 w-12 mb-4 opacity-50" />
          <p>No activity recorded yet</p>
        </div>
      )}
    </div>
  )
}

export function TimelineSummary({ events, startTime }: { events: TimelineEvent[]; startTime: Date }) {
  const blurEvents = events.filter(e => e.type === 'blur')
  const pasteEvents = events.filter(e => e.type === 'paste')
  const warningEvents = events.filter(e => e.severity === 'warning' || e.severity === 'critical')

  const totalBlurTime = blurEvents.reduce((acc, event, index) => {
    const nextFocus = events.find((e, i) => e.type === 'focus' && i > index)
    if (nextFocus) {
      return acc + (nextFocus.timestamp.getTime() - event.timestamp.getTime())
    }
    return acc
  }, 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
        <div className="text-2xl font-bold text-orange-400">{blurEvents.length}</div>
        <div className="text-sm text-slate-400">Focus Losses</div>
        <div className="text-xs text-orange-400/70 mt-1">
          {(totalBlurTime / 1000).toFixed(1)}s total
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
        <div className="text-2xl font-bold text-blue-400">{pasteEvents.length}</div>
        <div className="text-sm text-slate-400">Paste Events</div>
        <div className="text-xs text-blue-400/70 mt-1">
          {pasteEvents.reduce((acc, e) => {
            const match = e.details.match(/(\d+) characters/)
            return acc + (match ? parseInt(match[1]) : 0)
          }, 0)} chars pasted
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
        <div className="text-2xl font-bold text-red-400">{warningEvents.length}</div>
        <div className="text-sm text-slate-400">Warnings</div>
        <div className="text-xs text-red-400/70 mt-1">
          {warningEvents.filter(e => e.severity === 'critical').length} critical
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
        <div className="text-2xl font-bold text-emerald-400">
          {events.length > 0 ? Math.round((events.length / ((Date.now() - startTime.getTime()) / 60000)) * 60) : 0}
        </div>
        <div className="text-sm text-slate-400">Events/min</div>
        <div className="text-xs text-emerald-400/70 mt-1">
          Activity rate
        </div>
      </div>
    </div>
  )
}
