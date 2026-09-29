import { GithubOutlined, GitlabOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Space, Typography } from 'antd'
import { Navigate, useLocation } from 'react-router-dom'
import { startOAuthLogin } from '@/auth/oauth'
import { useAuth } from '@/auth/useAuth'

export function LoginPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--app-surface)',
      }}
    >
      <Card style={{ width: 420, maxWidth: '100%' }} className="app-content-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={3} style={{ marginBottom: 8 }}>
              Вход в DMC Console
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Войдите через учётную запись VCS, чтобы управлять репозиториями. Пока бэкенд не готов,
              используется имитация OAuth.
            </Typography.Paragraph>
          </div>
          <Alert
            type="info"
            showIcon
            message="Демо-режим"
            description="Вход имитирует редирект GitHub/GitLab и сохраняет JWT в localStorage с автообновлением."
          />
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              size="large"
              block
              icon={<GithubOutlined />}
              onClick={() => startOAuthLogin('github')}
            >
              Войти через GitHub
            </Button>
            <Button
              size="large"
              block
              icon={<GitlabOutlined />}
              onClick={() => startOAuthLogin('gitlab')}
            >
              Войти через GitLab
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}
