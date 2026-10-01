import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Avatar, Button, Dropdown, Layout, Space, Tag, Typography } from 'antd'
import { useAuth } from '@/features/auth'
import { useAppTheme } from '@/features/theme'
import styles from '@/widgets/app-shell/ui/AppHeader.module.css'

const { Header } = Layout

export function AppHeader() {
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useAppTheme()

  const menuItems = [
    {
      key: 'logout',
      label: 'Выйти',
      onClick: logout,
    },
  ]

  return (
    <Header className={`app-shell-header-bar app-main-header ${styles.header}`}>
      <Typography.Text type="secondary">Учебное рабочее пространство · мок API</Typography.Text>
      <Space size="middle">
        <Button
          type="text"
          icon={mode === 'light' ? <MoonOutlined /> : <SunOutlined />}
          onClick={toggleMode}
          aria-label="Переключить тему"
        />
        {user && (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Space className="cursor-pointer">
              <Avatar size="small" src={user.avatarUrl} />
              <span className="font-medium">{user.login}</span>
              <Tag color={user.provider === 'github' ? 'default' : 'orange'}>{user.provider}</Tag>
            </Space>
          </Dropdown>
        )}
      </Space>
    </Header>
  )
}
