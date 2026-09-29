import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { theme as antTheme, type ThemeConfig } from 'antd'

export type AppThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  mode: AppThemeMode
  toggleMode: () => void
  antdTheme: ThemeConfig
}

const THEME_KEY = 'dmc268.theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

const githubLikeTokens = {
  colorPrimary: '#0969da',
  borderRadius: 6,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
}

function buildAntdTheme(mode: AppThemeMode): ThemeConfig {
  const isDark = mode === 'dark'
  return {
    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      ...githubLikeTokens,
      colorBgLayout: isDark ? '#0d1117' : '#f6f8fa',
      colorBgContainer: isDark ? '#161b22' : '#ffffff',
      colorBorder: isDark ? '#30363d' : '#d0d7de',
      colorText: isDark ? '#e6edf3' : '#1f2328',
      colorTextSecondary: isDark ? '#8b949e' : '#656d76',
    },
    components: {
      Layout: {
        headerBg: isDark ? '#161b22' : '#ffffff',
        siderBg: isDark ? '#010409' : '#f6f8fa',
        bodyBg: isDark ? '#0d1117' : '#ffffff',
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: isDark ? '#21262d' : '#eaeef2',
        itemHoverBg: isDark ? '#21262d' : '#f3f4f6',
      },
    },
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    localStorage.setItem(THEME_KEY, mode)
    document.documentElement.dataset.theme = mode
  }, [mode])

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo(
    () => ({
      mode,
      toggleMode,
      antdTheme: buildAntdTheme(mode),
    }),
    [mode, toggleMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider')
  }
  return ctx
}
