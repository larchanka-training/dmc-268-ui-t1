import type { ThemeConfig } from 'antd'
import { theme as antTheme } from 'antd'

export type ThemeMode = 'light' | 'dark'

/** Ключ `localStorage`, под которым хранится выбранная тема. */
export const THEME_STORAGE_KEY = 'dmc268.theme'

export function readStoredThemeMode(): ThemeMode {
  return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

/** Единый источник цветов: CSS-переменные и токены antd. */
export interface ThemePalette {
  surface: string
  border: string
  text: string
  muted: string
  accentSubtle: string
  colorPrimary: string
  bgLayout: string
  bgContainer: string
  siderBg: string
  headerBg: string
  menuSelectedBg: string
  menuHoverBg: string
}

export const themePalette: Record<ThemeMode, ThemePalette> = {
  light: {
    surface: '#fff',
    border: '#d0d7de',
    text: '#1f2328',
    muted: '#656d76',
    accentSubtle: '#ddf4ff',
    colorPrimary: '#0969da',
    bgLayout: '#f6f8fa',
    bgContainer: '#fff',
    siderBg: '#f6f8fa',
    headerBg: '#fff',
    menuSelectedBg: '#eaeef2',
    menuHoverBg: '#f3f4f6',
  },
  dark: {
    surface: '#161b22',
    border: '#30363d',
    text: '#e6edf3',
    muted: '#8b949e',
    accentSubtle: '#051d4d',
    colorPrimary: '#0969da',
    bgLayout: '#0d1117',
    bgContainer: '#161b22',
    siderBg: '#010409',
    headerBg: '#161b22',
    menuSelectedBg: '#21262d',
    menuHoverBg: '#21262d',
  },
}

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif"

export function applyThemeCssVariables(mode: ThemeMode): void {
  const p = themePalette[mode]
  const root = document.documentElement
  root.style.setProperty('--app-bg', p.bgLayout)
  root.style.setProperty('--app-surface', p.surface)
  root.style.setProperty('--app-border', p.border)
  root.style.setProperty('--app-text', p.text)
  root.style.setProperty('--app-muted', p.muted)
  root.style.setProperty('--app-accent-subtle', p.accentSubtle)
}

export function buildAntdThemeConfig(mode: ThemeMode): ThemeConfig {
  const p = themePalette[mode]
  const isDark = mode === 'dark'
  return {
    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      colorPrimary: p.colorPrimary,
      borderRadius: 6,
      fontFamily,
      colorBgLayout: p.bgLayout,
      colorBgContainer: p.bgContainer,
      colorBorder: p.border,
      colorText: p.text,
      colorTextSecondary: p.muted,
    },
    components: {
      Layout: {
        headerBg: p.headerBg,
        siderBg: p.siderBg,
        bodyBg: p.bgLayout,
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: p.menuSelectedBg,
        itemHoverBg: p.menuHoverBg,
      },
    },
  }
}
