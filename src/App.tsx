import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { AppRouter } from '@/routes/AppRouter'
import { AuthProvider } from '@/auth/AuthContext'
import { ThemeProvider, useAppTheme } from '@/theme/ThemeContext'

function ThemedApp() {
  const { antdTheme } = useAppTheme()
  return (
    <ConfigProvider theme={antdTheme} locale={ruRU}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ConfigProvider>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  )
}

export default App
