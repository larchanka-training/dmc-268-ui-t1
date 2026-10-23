// Первым: настройка zod до построения любой схемы (см. файл).
import '@/shared/config/zod'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@/app/App.tsx'
import '@/index.css'
import '@/styles/global.css'
import { createTelemetry } from '@/shared/telemetry'
import { applyThemeCssVariables, readStoredThemeMode } from '@/shared/theme'

// До рендера: ошибка первого рендера тоже должна дойти до коллектора.
const telemetry = createTelemetry()

// Переменные `--app-*` выставляются до первого рендера: в CSS их значений нет,
// единственный источник палитры — `shared/theme/palette.ts`.
const initialTheme = readStoredThemeMode()
document.documentElement.dataset.theme = initialTheme
applyThemeCssVariables(initialTheme)

// С включённой телеметрией рендер ждёт SDK: иначе первые запросы к API (сессия, данные
// экрана) уходят раньше инструментирования `fetch` — без спана и `traceparent`. Ждём не
// дольше 2 с: зависшая загрузка чанка не должна оставить кабинет пустым, поздний SDK
// просто не увидит первые запросы. Без адреса коллектора `ready` уже выполнен, отказом
// он не завершается.
const SDK_WAIT_MS = 2000
void Promise.race([
  telemetry.ready,
  new Promise((resolve) => setTimeout(resolve, SDK_WAIT_MS)),
]).then(() =>
  ReactDOM.createRoot(document.getElementById('root')!, telemetry.rootOptions).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  ),
)
