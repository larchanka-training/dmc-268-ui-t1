import { GithubOutlined, GitlabOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Space, Typography } from 'antd'
import { Navigate, useLocation } from 'react-router-dom'
import { startOAuthLogin, useAuth } from '@/features/auth'
import styles from '@/pages/LoginPage.module.css'

export function LoginPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  return (
    <div className={styles.page}>
      <Card className={`app-content-card ${styles.card}`}>
        <Space direction="vertical" size="large" className={styles.stack}>
          <div>
            <Typography.Title level={1} className={`page-title ${styles['intro-title']}`}>
              Вход в DMC Console
            </Typography.Title>
            <Typography.Paragraph type="secondary" className={styles['intro-text']}>
              Войдите через учётную запись VCS, чтобы управлять репозиториями. Пока бэкенд не готов,
              используется имитация OAuth.
            </Typography.Paragraph>
          </div>
          <Alert
            type="info"
            showIcon
            message="Демо-режим"
            description="Вход имитирует редирект GitHub/GitLab; профиль в localStorage, access-токен — в памяти вкладки."
          />
          <Space direction="vertical" className={styles.actions}>
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
