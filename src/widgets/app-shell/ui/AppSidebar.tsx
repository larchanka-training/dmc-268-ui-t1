import {
  BookOutlined,
  DashboardOutlined,
  GithubOutlined,
  GitlabOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Menu } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from '@/widgets/app-shell/ui/AppSidebar.module.css'

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
    <div className={styles.root}>
      <div className="app-shell-header-bar app-sidebar-brand">
        <GithubOutlined aria-hidden />
        DMC Console
      </div>
      <nav className={styles.nav} aria-label="Основная навигация">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={navItems}
          onClick={({ key }) => navigate(key)}
          className={styles.menu}
        />
      </nav>
      <div className={styles.footer}>
        <GitlabOutlined className={styles['footer-icon']} aria-hidden />
        OAuth GitHub и GitLab
      </div>
    </div>
  )
}
