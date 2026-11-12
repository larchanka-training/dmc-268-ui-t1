import { useContext } from 'react'
import { ThemeContext } from '@/features/theme/model/theme-context'

export function useAppTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider')
  }
  return ctx
}

/** Режим темы для виджетов, которые рендерятся и без `ThemeProvider` (тесты): по умолчанию светлый. */
export function useThemeMode() {
  return useContext(ThemeContext)?.mode ?? 'light'
}
