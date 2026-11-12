import { Drawer, Grid, Layout } from 'antd'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/widgets/app-shell/ui/AppHeader'
import { AppSidebar } from '@/widgets/app-shell/ui/AppSidebar'
import { useAppTheme } from '@/features/theme'

const { Content, Sider } = Layout

export function AppLayout() {
  const { mode } = useAppTheme()
  // Уже `md` сайдбар не помещается рядом с контентом: навигация уходит в выдвижное меню.
  const narrow = Grid.useBreakpoint().md === false
  const [menuOpen, setMenuOpen] = useState(false)
  // Меню, открытое до поворота экрана, не всплывает само при возврате к узкой ширине.
  if (!narrow && menuOpen) setMenuOpen(false)
  return (
    <Layout className="app-layout-root">
      {!narrow && (
        <Sider width={240} theme={mode === 'dark' ? 'dark' : 'light'} className="app-layout-sider">
          <AppSidebar />
        </Sider>
      )}
      <Layout>
        <AppHeader onOpenMenu={narrow ? () => setMenuOpen(true) : undefined} />
        <Content className="app-layout-content">
          <main>
            <Outlet />
          </main>
        </Content>
      </Layout>
      {narrow && (
        <Drawer
          placement="left"
          size={260}
          open={menuOpen}
          aria-label="Меню"
          onClose={() => setMenuOpen(false)}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          <AppSidebar onNavigate={() => setMenuOpen(false)} />
        </Drawer>
      )}
    </Layout>
  )
}
