import { Layout } from 'antd'
import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/widgets/app-shell/ui/AppHeader'
import { AppSidebar } from '@/widgets/app-shell/ui/AppSidebar'
import { useAppTheme } from '@/features/theme'

const { Content, Sider } = Layout

export function AppLayout() {
  const { mode } = useAppTheme()
  return (
    <Layout className="app-layout-root">
      <Sider width={240} theme={mode === 'dark' ? 'dark' : 'light'} className="app-layout-sider">
        <AppSidebar />
      </Sider>
      <Layout>
        <AppHeader />
        <Content className="app-layout-content">
          <main>
            <Outlet />
          </main>
        </Content>
      </Layout>
    </Layout>
  )
}
