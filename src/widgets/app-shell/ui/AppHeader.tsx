import { MenuOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Avatar, Button, Dropdown, Grid, Layout, Space, Tag, Typography } from 'antd'
import { useCurrentUser, useLogout } from '@/features/auth'
import { useAppTheme } from '@/features/theme'
import { TopupHeaderButton } from '@/features/topup'
import { formatEuro, isNegativeAmount } from '@/shared/lib'
import styles from '@/widgets/app-shell/ui/AppHeader.module.css'

const { Header } = Layout

/** `onOpenMenu` есть на узком экране: кнопка меню вместо сайдбара. */
export function AppHeader({ onOpenMenu }: { onOpenMenu?: () => void } = {}) {
  const user = useCurrentUser()
  const logout = useLogout()
  const { mode, toggleMode } = useAppTheme()
  const screens = Grid.useBreakpoint()

  const menuItems = [
    {
      key: 'logout',
      label: 'Выйти',
      onClick: () => void logout(),
    },
  ]

  return (
    <Header className={`app-shell-header-bar app-main-header ${styles.header}`}>
      {onOpenMenu ? (
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onOpenMenu}
          aria-label="Открыть меню"
        />
      ) : (
        screens.xl && (
          <Typography.Text type="secondary">Учебное рабочее пространство</Typography.Text>
        )
      )}
      {/* Без подписи слева `space-between` прижал бы управление к левому краю. */}
      <Space size="middle" className="ml-auto">
        <Typography.Text
          type={isNegativeAmount(user.balanceEur) ? 'danger' : 'secondary'}
          className="whitespace-nowrap"
        >
          Баланс: {formatEuro(user.balanceEur)}
        </Typography.Text>
        <TopupHeaderButton userId={user.id} />
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
            <span className="hidden font-medium whitespace-nowrap md:inline">{user.login}</span>
            <Tag
              color={user.provider === 'github' ? 'default' : 'orange'}
              className="hidden md:inline-block"
            >
              {user.provider}
            </Tag>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}
