import React from 'react'
import { cn } from '@/renderer/lib/utils'
import { Eye, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'

export type ProctorStatus = 'idle' | 'active' | 'warning' | 'critical'

interface StatusIndicatorProps {
  status: ProctorStatus
  gazeDirection?: string
  lastWarningTime?: Date
  className?: string
}

export function StatusIndicator({
  status,
  gazeDirection = 'center',
  lastWarningTime,
  className,
}: StatusIndicatorProps) {
  const statusConfig = {
    idle: {
      icon: Eye,
      label: 'Monitoring Inactive',
      color: 'bg-slate-800/50 text-slate-400 border border-slate-700/50',
      iconColor: 'text-slate-500',
    },
    active: {
      icon: Eye,
      label: 'Monitoring Active',
      color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
      iconColor: 'text-emerald-400',
    },
    warning: {
      icon: AlertTriangle,
      label: 'Warning Detected',
      color: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
      iconColor: 'text-amber-400',
    },
    critical: {
      icon: AlertCircle,
      label: 'Critical Alert',
      color: 'bg-red-500/10 text-red-400 border border-red-500/30',
      iconColor: 'text-red-400',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm shadow-lg', config.color)}>
        <Icon className={cn('h-4 w-4', config.iconColor)} />
        <span className="text-sm font-medium">{config.label}</span>
        {status === 'active' && (
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
        )}
      </div>
      {status !== 'idle' && (
        <div className="text-xs text-slate-400">
          <span>Gaze: {gazeDirection}</span>
        </div>
      )}
    </div>
  )
}
