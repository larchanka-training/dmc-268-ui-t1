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
  /** Поля ввода и селекты: в тёмной теме темнее карточки, иначе сливаются с ней. */
  fieldBg: string
  fieldBorder: string
  placeholder: string
  /** Дорожка выключенного переключателя: в тёмной теме иначе не видна на фоне карточки. */
  switchOff: string
  /** Зелёный «успеха» с контрастом не ниже 4.5:1 на поверхности темы. */
  success: string
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
    fieldBg: '#fff',
    fieldBorder: '#d0d7de',
    placeholder: '#8c959f',
    switchOff: 'rgba(0, 0, 0, 0.25)',
    success: '#1a7f37',
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
    fieldBg: '#0d1117',
    fieldBorder: '#3d444d',
    placeholder: '#7d8590',
    switchOff: '#6e7681',
    success: '#3fb950',
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
  root.style.setProperty('--app-accent', p.colorPrimary)
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
      colorTextPlaceholder: p.placeholder,
      colorSuccess: p.success,
    },
    components: {
      Layout: {
        headerBg: p.headerBg,
        siderBg: p.siderBg,
        bodyBg: p.bgLayout,
      },
      Input: { colorBgContainer: p.fieldBg, colorBorder: p.fieldBorder },
      InputNumber: { colorBgContainer: p.fieldBg, colorBorder: p.fieldBorder },
      Select: { colorBgContainer: p.fieldBg, colorBorder: p.fieldBorder },
      DatePicker: { colorBgContainer: p.fieldBg, colorBorder: p.fieldBorder },
      // Заголовки разделов мельче заголовка страницы (`.page-title`, 24 px). Только в Typography:
      // глобальный токен уменьшил бы Steps, Result и Alert.
      Typography: { fontSizeHeading2: 20, fontSizeHeading3: 16 },
      Switch: { colorTextQuaternary: p.switchOff, colorTextTertiary: p.placeholder },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: p.menuSelectedBg,
        itemHoverBg: p.menuHoverBg,
      },
    },
  }
}
