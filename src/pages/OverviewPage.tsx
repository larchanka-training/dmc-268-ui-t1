import { Link } from 'react-router-dom'
import { Button, Card, Col, Row, Statistic, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { mockFetchConnectedRepositories } from '@/api/mock/repositoriesApi'
import { useAuth } from '@/auth/useAuth'

export function OverviewPage() {
  const { user } = useAuth()
  const [connectedCount, setConnectedCount] = useState(0)

  useEffect(() => {
    mockFetchConnectedRepositories().then((repos) => setConnectedCount(repos.length))
  }, [])

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        С возвращением, {user?.name}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Управляйте подключёнными репозиториями и статусом синхронизации в рабочем пространстве.
      </Typography.Paragraph>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card className="app-content-card">
            <Statistic title="Подключённых репозиториев" value={connectedCount} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="app-content-card">
            <Statistic title="Провайдер VCS" value={user?.provider ?? '—'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="app-content-card">
            <Statistic title="Сессия" value="Активна" valueStyle={{ color: '#1a7f37' }} />
          </Card>
        </Col>
      </Row>
      <Card className="app-content-card" style={{ marginTop: 24 }}>
        <Typography.Title level={5}>Быстрые действия</Typography.Title>
        <Link to="/repositories">
          <Button type="primary">Список репозиториев</Button>
        </Link>
        <Link to="/repositories/connect" style={{ marginLeft: 8 }}>
          <Button>Подключить репозиторий</Button>
        </Link>
      </Card>
    </div>
  )
}
