import React from 'react'
import { cn } from '@/renderer/lib/utils'

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
  size?: BadgeSize
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors'

  const variants = {
    default: 'bg-secondary text-secondary-foreground',
    primary: 'bg-primary/10 text-primary border border-primary/20',
    secondary: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-800 border border-green-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    destructive: 'bg-red-100 text-red-800 border border-red-200',
    outline: 'border border-border bg-transparent',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
