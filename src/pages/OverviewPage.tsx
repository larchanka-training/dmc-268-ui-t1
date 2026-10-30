import { Link } from 'react-router-dom'
import { Button, Card, Col, Row, Statistic, Typography } from 'antd'
import { useCurrentUser } from '@/features/auth'
import { useRepositories } from '@/features/repository'

export function OverviewPage() {
  const user = useCurrentUser()
  const { data, isLoading, isLoadingError, refetch } = useRepositories()
  const connectedCount = data?.items.filter((repo) => repo.connected).length

  return (
    <div>
      <Typography.Title level={1} className="page-title">
        С возвращением, {user.name || user.login}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Управляйте подключёнными репозиториями и статусом синхронизации в рабочем пространстве.
      </Typography.Paragraph>
      <Row gutter={[16, 16]} className="page-section">
        <Col xs={24} sm={12} md={8}>
          <Card className="app-content-card">
            {/* Список не загрузился — не «0»: это выглядело бы как «репозиториев нет». */}
            <Statistic
              title="Подключённых репозиториев"
              value={connectedCount ?? '—'}
              loading={isLoading}
            />
            {isLoadingError && (
              <div role="alert" className="mt-2 text-sm text-red-700">
                Не удалось загрузить репозитории.{' '}
                <Button size="small" type="link" onClick={() => void refetch()}>
                  Повторить
                </Button>
              </div>
            )}
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
      <Card className={`app-content-card page-section`}>
        <Typography.Title level={2}>Быстрые действия</Typography.Title>
        <Link to="/repositories">
          <Button type="primary">Список репозиториев</Button>
        </Link>
      </Card>
    </div>
  )
}
