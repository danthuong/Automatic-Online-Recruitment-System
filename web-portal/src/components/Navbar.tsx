import { Link, useLocation } from 'react-router-dom'
import { LogOut, Menu, X, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { user, logout, isLoading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const isHr = user?.role === 'hr' || user?.role === 'admin'

  const candidateLinks = [
    { to: '/', label: 'Home' },
    { to: '/jobs', label: 'Jobs' },
    { to: '/companies', label: 'Companies' },
  ]

  const hrLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/hr/jobs', label: 'My Jobs' },
  ]

  const navLinks = isHr ? hrLinks : candidateLinks

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <svg
                width="32"
                height="32"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="40" height="40" rx="10" fill="hsl(239 84% 67%)" fillOpacity="0.15" />
                <path
                  d="M20 8L32 32H8L20 8Z"
                  stroke="hsl(239 84%/67%)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="20" cy="22" r="4" fill="hsl(239 84%/67%)" />
              </svg>
              <span className="text-xl font-bold tracking-tight hidden sm:block">LotusHack</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    location.pathname === link.to
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {isHr && (
                <Link
                  to="/hr"
                  className="px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <LayoutDashboard className="w-4 h-4 inline mr-1.5" />
                  HR Portal
                </Link>
              )}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="text-sm text-right">
              <p className="font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout} isLoading={isLoading} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          <button
            className="md:hidden p-2 rounded-md hover:bg-accent"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-card px-4 py-4 space-y-3">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
                  location.pathname === link.to
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {link.label}
              </Link>
            ))}
            {isHr && (
              <Link
                to="/hr"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                HR Portal
              </Link>
            )}
          </nav>
          <div className="pt-3 border-t flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout} isLoading={isLoading}>
              Logout
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
