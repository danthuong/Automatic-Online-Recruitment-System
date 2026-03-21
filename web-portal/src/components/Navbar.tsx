import { Link } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const { user, logout, isLoading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

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
              <NavLink to="/">Home</NavLink>
              <NavLink to="/jobs">Jobs</NavLink>
              <NavLink to="/companies">Companies</NavLink>
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
            <MobileNavLink to="/" onClick={() => setMobileOpen(false)}>Home</MobileNavLink>
            <MobileNavLink to="/jobs" onClick={() => setMobileOpen(false)}>Jobs</MobileNavLink>
            <MobileNavLink to="/companies" onClick={() => setMobileOpen(false)}>Companies</MobileNavLink>
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

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
    >
      {children}
    </Link>
  )
}
