import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Layout, Space } from 'antd'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppTheme } from '@/features/theme'

/**
 * Каркас публичных страниц приложения («Помощь», «Статус сервиса»): они открыты без сессии,
 * поэтому вместо `AppLayout` с меню и профилем — простая шапка с названием, «В кабинет» и темой.
 */
export function PublicLayout({ children }: { children: ReactNode }) {
  const { mode, toggleMode } = useAppTheme()
  const { key } = useLocation()
  const navigate = useNavigate()

  return (
    <Layout className="app-layout-root">
      <Layout.Header className="app-shell-header-bar app-main-header">
        <a href="/">DMC Console</a>
        <Space>
          {/* Пришли из кабинета (в истории приложения есть запись до этой страницы) —
              возвращаемся туда же. Открыли по ссылке или с входа — на «Обзор». */}
          <Link
            to="/"
            onClick={(event) => {
              if (key === 'default') return
              event.preventDefault()
              void navigate(-1)
            }}
          >
            В кабинет
          </Link>
          <Button
            type="text"
            icon={mode === 'light' ? <MoonOutlined /> : <SunOutlined />}
            onClick={toggleMode}
            aria-label="Переключить тему"
          />
        </Space>
      </Layout.Header>
      <Layout.Content className="app-layout-content">{children}</Layout.Content>
    </Layout>
  )
}
