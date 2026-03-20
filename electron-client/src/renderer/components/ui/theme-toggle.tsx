import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { useTheme } from '@/renderer/hooks/useTheme'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, themeMode, setTheme, setThemeMode, isSystem } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun, description: 'Clean & bright' },
    { value: 'dark' as const, label: 'Dark', icon: Moon, description: 'Easy on eyes' },
    { value: 'system' as const, label: 'System', icon: Monitor, description: 'Follow OS' },
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
          'relative w-10 h-10 rounded-lg flex items-center justify-center',
          'bg-card border border-border shadow-sm',
          'hover:bg-secondary transition-colors duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
        aria-label="Theme settings"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="text-foreground"
          >
            <Icon className="w-5 h-5" />
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              className={cn(
                'absolute right-0 top-full mt-2 z-50',
                'w-48 rounded-lg bg-card border border-border',
                'shadow-lg py-1'
              )}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
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
                      'transition-colors duration-150',
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <OptionIcon className={cn('w-4 h-4', isActive && 'text-primary')} />
                    <div className="flex-1 text-left">
                      <div className={cn('text-sm font-medium', isActive && 'text-primary')}>
                        {option.label}
                      </div>
                      <div className="text-xs text-muted-foreground/70">
                        {option.description}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
