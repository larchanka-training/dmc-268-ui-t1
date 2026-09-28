import {
  BookOutlined,
  DashboardOutlined,
  GithubOutlined,
  GitlabOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Menu } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Обзор' },
  { key: '/repositories', icon: <BookOutlined />, label: 'Репозитории' },
  { key: '/repositories/connect', icon: <PlusOutlined />, label: 'Подключить репозиторий' },
]

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey =
    navItems
      .map((item) => item.key)
      .filter((key) => location.pathname === key || location.pathname.startsWith(`${key}/`))
      .sort((a, b) => b.length - a.length)[0] ?? '/'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        className="app-sidebar-brand"
        style={{
          padding: '16px 20px',
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid var(--app-border)',
        }}
      >
        <GithubOutlined aria-hidden />
        DMC Console
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={navItems}
        onClick={({ key }) => navigate(key)}
        style={{ flex: 1, borderInlineEnd: 0, padding: '8px 0' }}
      />
      <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--app-muted)' }}>
        <GitlabOutlined style={{ marginRight: 6 }} />
        OAuth GitHub и GitLab
      </div>
    </div>
  )
}
