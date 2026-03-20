import React from 'react'
import { cn } from '@/renderer/lib/utils'

interface ExamShellProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  className?: string
}

export function ExamShell({ children, sidebar, header, className }: ExamShellProps) {
  return (
    <div className={cn('min-h-screen bg-slate-900', className)}>
      {header && (
        <header className="sticky top-0 z-40 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-xl">
          {header}
        </header>
      )}
      <div className="flex">
        {sidebar && (
          <aside className="sticky top-[65px] h-[calc(100vh-65px)] w-72 border-r border-slate-800/50 bg-slate-950/30 backdrop-blur-md overflow-y-auto">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 min-h-[calc(100vh-65px)] p-8">
          <div className="mx-auto max-w-4xl animate-in">{children}</div>
        </main>
      </div>
    </div>
  )
}
