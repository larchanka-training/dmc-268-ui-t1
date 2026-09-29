import { Layout } from 'antd'
import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/widgets/app-shell/ui/AppHeader'
import { AppSidebar } from '@/widgets/app-shell/ui/AppSidebar'
import { useAppTheme } from '@/features/theme'

const { Content, Sider } = Layout

export function AppLayout() {
  const { mode } = useAppTheme()
  return (
    <Layout style={{ minHeight: '100%' }}>
      <Sider
        width={240}
        theme={mode === 'dark' ? 'dark' : 'light'}
        style={{ borderRight: '1px solid var(--app-border)' }}
      >
        <AppSidebar />
      </Sider>
      <Layout>
        <AppHeader />
        <Content style={{ padding: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
