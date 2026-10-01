import React from 'react'
import ReactDOM from 'react-dom/client'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import App from '@/App.tsx'
import '@/index.css'
import '@/styles/global.css'
import { applyThemeCssVariables } from '@/shared/theme'

dayjs.locale('ru')

const storedTheme = localStorage.getItem('dmc268.theme')
const initialTheme = storedTheme === 'dark' ? 'dark' : 'light'
document.documentElement.dataset.theme = initialTheme
applyThemeCssVariables(initialTheme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
