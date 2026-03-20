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
          'relative w-9 h-9 rounded-lg flex items-center justify-center',
          'bg-transparent border border-transparent',
          'hover:bg-accent/50',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/40 focus-visible:outline-offset-2',
          'transition-all duration-200'
        )}
        aria-label="Theme settings"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="text-foreground"
          >
            <Icon className="w-[18px] h-[18px]" />
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
              transition={{ duration: 0.15 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Menu - Fabric unfold effect */}
            <motion.div
              className={cn(
                'absolute right-0 top-full mt-2 z-50',
                'w-48 rounded-lg bg-card border border-border',
                'shadow-[0_4px_16px_rgba(0,0,0,0.08)] py-1'
              )}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
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
                      'transition-all duration-200',
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
                      <motion.div 
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      />
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
