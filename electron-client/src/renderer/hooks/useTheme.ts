import { useThemeContext } from '@/renderer/contexts/ThemeContext'

export function useTheme() {
  const { theme, themeMode, setTheme, setThemeMode, toggleTheme, isSystem } = useThemeContext()
  
  return {
    theme,
    themeMode,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isSystem,
    setTheme,
    setThemeMode,
    toggleTheme,
  }
}
