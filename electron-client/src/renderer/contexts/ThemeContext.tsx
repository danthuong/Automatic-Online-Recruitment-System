import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'

type Theme = 'dark' | 'light'
type ThemeMode = Theme | 'system'

interface ThemeContextType {
  theme: Theme
  themeMode: ThemeMode
  setTheme: (theme: Theme) => void
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
  isSystem: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'recruit-exam-theme'

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

function getStoredTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored as ThemeMode
    }
  }
  return 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getStoredTheme)
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme)

  const theme: Theme = useMemo(() => {
    if (themeMode === 'system') {
      return systemTheme
    }
    return themeMode
  }, [themeMode, systemTheme])

  const isSystem = themeMode === 'system'

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    
    localStorage.setItem(STORAGE_KEY, themeMode)
  }, [theme, themeMode])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeModeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }, [theme, setTheme])

  const value = useMemo(() => ({
    theme,
    themeMode,
    setTheme,
    setThemeMode,
    toggleTheme,
    isSystem,
  }), [theme, themeMode, setTheme, setThemeMode, toggleTheme, isSystem])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}
