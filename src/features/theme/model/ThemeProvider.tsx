import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ThemeContext,
  type AppThemeMode,
  type ThemeContextValue,
} from '@/features/theme/model/theme-context'
import {
  THEME_STORAGE_KEY,
  applyThemeCssVariables,
  buildAntdThemeConfig,
  readStoredThemeMode,
} from '@/shared/theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppThemeMode>(readStoredThemeMode)

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
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
