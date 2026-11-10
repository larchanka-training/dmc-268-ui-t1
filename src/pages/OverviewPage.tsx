import { Link } from 'react-router-dom'
import { Button, Card, Col, Modal, Row, Statistic, Typography, message } from 'antd'
import type { PaidRepository } from '@/entities/session'
import { useCurrentUser } from '@/features/auth'
import { useRepositories, useStopPayment } from '@/features/repository'
import { formatEuro } from '@/shared/lib'

/** Блок «Я плачу за»: репозитории из `paid_repositories` профиля и отказ от оплаты. */
function PaidRepositoriesCard({ repositories }: { repositories: PaidRepository[] }) {
  const stop = useStopPayment()
  const [messageApi, messageHolder] = message.useMessage()
  const [modal, modalHolder] = Modal.useModal()

  const confirmStop = (repo: PaidRepository) =>
    void modal.confirm({
      title: `Перестать платить за ${repo.fullName}?`,
      content:
        'Ревью в этом репозитории остановится, пока участник с ролью admin или maintain не возьмёт оплату на себя.',
      okText: 'Перестать платить',
      cancelText: 'Отмена',
      onOk: () => {
        // `404 REPOSITORY_NOT_FOUND` — платит уже не вы: показываем `detail` ответа.
        void stop.mutateAsync(repo.id).catch((error: unknown) => {
          void messageApi.error(
            error instanceof Error && error.message
              ? error.message
              : 'Не удалось перестать платить',
          )
        })
      },
    })

  return (
    <Card className="app-content-card page-section">
      {messageHolder}
      {modalHolder}
      <Typography.Title level={2}>Я плачу за</Typography.Title>
      {repositories.length === 0 ? (
        <Typography.Text type="secondary">Вы не платите ни за один репозиторий.</Typography.Text>
      ) : (
        <ul className="divide-y divide-slate-200">
          {repositories.map((repo) => (
            <li key={repo.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <Typography.Text>{repo.fullName}</Typography.Text>
              <Button
                size="small"
                aria-label={`Перестать платить за ${repo.fullName}`}
                loading={stop.isPending && stop.variables === repo.id}
                onClick={() => confirmStop(repo)}
              >
                Перестать платить
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function OverviewPage() {
  const user = useCurrentUser()
  const negativeBalance = user.balanceEur.startsWith('-')
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
        <Col xs={24} sm={12} md={12} lg={6}>
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
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card className="app-content-card">
            <Statistic
              title="Баланс"
              value={formatEuro(user.balanceEur)}
              valueStyle={negativeBalance ? { color: '#cf1322' } : undefined}
            />
            <Typography.Text type="secondary" className="text-meta">
              Пополняет администратор сервиса
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card className="app-content-card">
            <Statistic title="Провайдер VCS" value={user?.provider ?? '—'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card className="app-content-card">
            <Statistic title="Сессия" value="Активна" valueStyle={{ color: '#1a7f37' }} />
          </Card>
        </Col>
      </Row>
      <PaidRepositoriesCard repositories={user.paidRepositories} />
      <Card className={`app-content-card page-section`}>
        <Typography.Title level={2}>Быстрые действия</Typography.Title>
        <Link to="/repositories">
          <Button type="primary">Список репозиториев</Button>
        </Link>
      </Card>
    </div>
  )
}
