import React, { useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { useTheme } from '@/renderer/hooks/useTheme'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, themeMode, setTheme, setThemeMode, isSystem } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ]

  const currentOption = themeOptions.find(opt => 
    opt.value === themeMode || (opt.value === 'system' && isSystem)
  ) || themeOptions[1]

  const Icon = currentOption.icon

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative w-9 h-9 rounded-lg flex items-center justify-center',
          'hover:bg-accent',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'transition-colors duration-200'
        )}
        aria-label="Theme settings"
      >
        <Icon className="w-[18px] h-[18px] text-foreground" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={cn(
              'absolute right-0 top-full mt-2 z-50',
              'w-48 rounded-lg bg-card border border-border shadow-lg py-1'
            )}
          >
            <div className="text-xs font-medium text-muted-foreground px-3 py-2">
              Theme Mode
            </div>

            {themeOptions.map((option) => {
              const OptionIcon = option.icon
              const isActive = option.value === themeMode

              return (
                <button
                  key={option.value}
                  onClick={() => {
                    if (option.value === 'system') {
                      setThemeMode('system')
                    } else {
                      setTheme(option.value)
                    }
                    setIsOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2',
                    'transition-colors duration-200',
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <OptionIcon className={cn('w-4 h-4', isActive && 'text-primary')} />
                  <span className={cn('text-sm font-medium', isActive && 'text-primary')}>
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
