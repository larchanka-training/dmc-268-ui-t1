import { createContext } from 'react'
import type { ThemeConfig } from 'antd'

export type AppThemeMode = 'light' | 'dark'

export interface ThemeContextValue {
  mode: AppThemeMode
  toggleMode: () => void
  antdTheme: ThemeConfig
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
