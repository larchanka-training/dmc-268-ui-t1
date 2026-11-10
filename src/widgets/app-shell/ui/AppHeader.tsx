import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Avatar, Button, Dropdown, Layout, Space, Tag, Typography } from 'antd'
import { useCurrentUser, useLogout } from '@/features/auth'
import { useAppTheme } from '@/features/theme'
import { formatEuro } from '@/shared/lib'
import styles from '@/widgets/app-shell/ui/AppHeader.module.css'

const { Header } = Layout

export function AppHeader() {
  const user = useCurrentUser()
  const logout = useLogout()
  const { mode, toggleMode } = useAppTheme()

  const menuItems = [
    {
      key: 'logout',
      label: 'Выйти',
      onClick: () => void logout(),
    },
  ]

  return (
    <Header className={`app-shell-header-bar app-main-header ${styles.header}`}>
      <Typography.Text type="secondary">Учебное рабочее пространство</Typography.Text>
      <Space size="middle">
        <Typography.Text type={user.balanceEur.startsWith('-') ? 'danger' : 'secondary'}>
          Баланс: {formatEuro(user.balanceEur)}
        </Typography.Text>
        <Button
          type="text"
          icon={mode === 'light' ? <MoonOutlined /> : <SunOutlined />}
          onClick={toggleMode}
          aria-label="Переключить тему"
        />
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Space className="cursor-pointer">
            <Avatar size="small" src={user.avatarUrl || undefined}>
              {user.login.slice(0, 1).toUpperCase()}
            </Avatar>
            <span className="font-medium">{user.login}</span>
            <Tag color={user.provider === 'github' ? 'default' : 'orange'}>{user.provider}</Tag>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}
