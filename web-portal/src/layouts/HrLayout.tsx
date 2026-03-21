import { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'

interface HrLayoutProps {
  children: ReactNode
}

export function HrLayout({ children }: HrLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
