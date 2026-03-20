import React from 'react'
import { cn } from '@/renderer/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  width?: string | number
  height?: string | number
  shimmer?: boolean
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  shimmer = true,
  style,
  ...props
}: SkeletonProps) {
  const baseStyles = 'bg-muted animate-pulse'

  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  }

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        shimmer && 'shimmer',
        className
      )}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      {...props}
    >
      {shimmer && (
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      )}
    </div>
  )
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height={16}
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 p-4 rounded-xl border border-border bg-card', className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" height={14} className="w-1/3" />
          <Skeleton variant="text" height={12} className="w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  )
}

export function SkeletonButton({ className }: { className?: string }) {
  return (
    <Skeleton
      variant="rectangular"
      height={40}
      className={cn('w-24 rounded-lg', className)}
    />
  )
}

export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  )
}
