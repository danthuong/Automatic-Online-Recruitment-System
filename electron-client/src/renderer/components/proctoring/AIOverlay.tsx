import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/renderer/lib/utils'
import { useTheme } from '@/renderer/hooks/useTheme'
import type { AIProctorState, AIAlert } from '@/renderer/services/ai-proctor-types'
import { Eye, AlertTriangle, Hand, Brain, CheckCircle, XCircle } from 'lucide-react'

interface AIOverlayProps {
  state: AIProctorState | null
  className?: string
}

const FACE_DIRECTION_LABELS: Record<string, { label: string; color: string }> = {
  center: { label: 'Center', color: 'text-green-500' },
  left: { label: 'Looking Left', color: 'text-amber-500' },
  right: { label: 'Looking Right', color: 'text-amber-500' },
  up: { label: 'Looking Up', color: 'text-amber-500' },
  down: { label: 'Looking Down', color: 'text-amber-500' },
  unknown: { label: 'Detecting...', color: 'text-slate-400' },
}

export function AIOverlay({ state, className }: AIOverlayProps) {
  const { theme } = useTheme()

  if (!state) return null

  const faceDir = FACE_DIRECTION_LABELS[state.faceDirection] || FACE_DIRECTION_LABELS.unknown

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-2 gap-2">
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border',
          theme === 'dark' 
            ? 'bg-card border-border' 
            : 'bg-white border-slate-200'
        )}>
          <Eye className={cn('h-4 w-4', state.faceCount === 1 ? 'text-green-500' : state.faceCount === 0 ? 'text-red-500' : 'text-red-500')} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Faces</p>
            <p className={cn('text-sm font-medium', state.faceCount === 1 ? 'text-green-500' : state.faceCount === 0 ? 'text-red-500' : 'text-red-500')}>
              {state.faceCount === 1 ? '1 detected' : state.faceCount === 0 ? 'No face' : `${state.faceCount} faces`}
            </p>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border',
          theme === 'dark' 
            ? 'bg-card border-border' 
            : 'bg-white border-slate-200'
        )}>
          <Eye className={cn('h-4 w-4', faceDir.color)} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Gaze</p>
            <p className={cn('text-sm font-medium', faceDir.color)}>
              {faceDir.label}
            </p>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border',
          theme === 'dark' 
            ? 'bg-card border-border' 
            : 'bg-white border-slate-200'
        )}>
          <Hand className={cn('h-4 w-4', state.handsDetected > 0 ? 'text-green-500' : 'text-slate-400')} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Hands</p>
            <p className={cn('text-sm font-medium', state.handsDetected > 0 ? 'text-green-500' : 'text-slate-400')}>
              {state.handsDetected > 0 ? `${state.handsDetected} detected` : 'No hands'}
            </p>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border',
          theme === 'dark' 
            ? 'bg-card border-border' 
            : 'bg-white border-slate-200'
        )}>
          {state.gesture && state.gesture.toLowerCase().includes('cheat') ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : state.gesture ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Brain className="h-4 w-4 text-slate-400" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Gesture</p>
            <p className={cn(
              'text-sm font-medium truncate',
              state.gesture && state.gesture.toLowerCase().includes('cheat') ? 'text-red-500' :
              state.gesture ? 'text-green-500' : 'text-slate-400'
            )}>
              {state.gesture || 'Waiting...'}
            </p>
          </div>
        </div>
      </div>

      {state.cheatingProbability > 0 && (
        <div className={cn(
          'px-3 py-2 rounded-lg border',
          theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'
        )}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Cheating Probability</span>
            <span className={cn(
              'text-sm font-bold',
              state.cheatingProbability > 70 ? 'text-red-500' :
              state.cheatingProbability > 40 ? 'text-amber-500' : 'text-green-500'
            )}>
              {state.cheatingProbability.toFixed(1)}%
            </span>
          </div>
          <div className={cn(
            'h-1.5 rounded-full overflow-hidden',
            theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
          )}>
            <motion.div
              className={cn(
                'h-full rounded-full',
                state.cheatingProbability > 70 ? 'bg-red-500' :
                state.cheatingProbability > 40 ? 'bg-amber-500' : 'bg-green-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(state.cheatingProbability, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border',
        state.calibrationStatus === 'calibrated' 
          ? theme === 'dark' ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
          : state.calibrationStatus === 'calibrating'
            ? theme === 'dark' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
            : theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'
      )}>
        <div className={cn(
          'w-2 h-2 rounded-full',
          state.calibrationStatus === 'calibrated' ? 'bg-green-500 animate-pulse' :
          state.calibrationStatus === 'calibrating' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
        )} />
        <p className={cn(
          'text-xs font-medium',
          state.calibrationStatus === 'calibrated' 
            ? theme === 'dark' ? 'text-green-400' : 'text-green-700'
            : state.calibrationStatus === 'calibrating'
              ? theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
              : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
        )}>
          {state.calibrationStatus === 'calibrated' ? 'AI Calibrated' :
           state.calibrationStatus === 'calibrating' ? 'Calibrating AI...' :
           state.calibrationStatus === 'failed' ? 'Calibration Failed' : 'AI Not Connected'}
        </p>
        {state.isConnected && (
          <span className="ml-auto text-xs text-green-500 font-medium">Online</span>
        )}
      </div>

      <AnimatePresence>
        {state.alerts.length > 0 && (
          <div className="space-y-1">
            {state.alerts.slice(-3).map((alert, i) => (
              <motion.div
                key={`${alert.timestamp}-${i}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
                  alert.type === 'CRITICAL'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : alert.type === 'SUSPICIOUS'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                )}
              >
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{alert.message}</span>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
