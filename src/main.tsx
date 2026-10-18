import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@/app/App.tsx'
import '@/index.css'
import '@/styles/global.css'
import { applyThemeCssVariables, readStoredThemeMode } from '@/shared/theme'

// Переменные `--app-*` выставляются до первого рендера: в CSS их значений нет,
// единственный источник палитры — `shared/theme/palette.ts`.
const initialTheme = readStoredThemeMode()
document.documentElement.dataset.theme = initialTheme
applyThemeCssVariables(initialTheme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
