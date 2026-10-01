import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ThemeContext,
  type AppThemeMode,
  type ThemeContextValue,
} from '@/features/theme/model/theme-context'
import { applyThemeCssVariables, buildAntdThemeConfig } from '@/shared/theme'

const THEME_KEY = 'dmc268.theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    localStorage.setItem(THEME_KEY, mode)
    document.documentElement.dataset.theme = mode
    applyThemeCssVariables(mode)
  }, [mode])

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      toggleMode,
      antdTheme: buildAntdThemeConfig(mode),
    }),
    [mode, toggleMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
