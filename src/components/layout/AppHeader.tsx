import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Avatar, Button, Dropdown, Layout, Space, Tag, Typography } from 'antd'
import { useAuth } from '@/auth/useAuth'
import { useAppTheme } from '@/theme/ThemeContext'

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
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--app-border)',
        height: 56,
        lineHeight: '56px',
      }}
    >
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        Учебное рабочее пространство · мок API
      </Typography.Text>
      <Space size="middle">
        <Button
          type="text"
          icon={mode === 'light' ? <MoonOutlined /> : <SunOutlined />}
          onClick={toggleMode}
          aria-label="Переключить тему"
        />
        {user && (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" src={user.avatarUrl} />
              <span style={{ fontWeight: 500 }}>{user.login}</span>
              <Tag color={user.provider === 'github' ? 'default' : 'orange'}>{user.provider}</Tag>
            </Space>
          </Dropdown>
        )}
      </Space>
    </Header>
  )
}
