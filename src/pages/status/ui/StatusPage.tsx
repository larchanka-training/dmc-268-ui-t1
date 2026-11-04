import { Alert, Button, Typography } from 'antd'

import {
  SERVICE_COMPONENT_LABELS,
  SERVICE_STATUS_LABELS,
  ServiceStatusTag,
  viewFromFailure,
  viewFromReport,
  type ServiceStatus,
  type ServiceStatusView,
} from '@/entities/service-status'
import { formatDateTime } from '@/shared/lib'
import { LoadingState } from '@/shared/ui'
import { PublicLayout } from '@/widgets/app-shell'

import { STATUS_REFETCH_INTERVAL_MS, useServiceStatus } from '../model/serviceStatusQuery'

const { Title, Text } = Typography

const REFETCH_INTERVAL_SECONDS = STATUS_REFETCH_INTERVAL_MS / 1000

const OVERALL_ALERT: Record<ServiceStatus, 'success' | 'warning' | 'error' | 'info'> = {
  operational: 'success',
  degraded: 'warning',
  outage: 'error',
  unknown: 'info',
}

const OVERALL_TEXT: Record<ServiceStatus, string> = {
  operational: 'Все компоненты работают.',
  degraded: 'Часть компонентов работает со сбоями: ревью может приходить с задержкой.',
  outage: 'Один из компонентов недоступен: ревью сейчас может не прийти.',
  unknown: 'Состояние части компонентов сейчас неизвестно.',
}

function StatusReport({ view }: { view: ServiceStatusView }) {
  return (
    <>
      <section className="page-section" aria-label="Общее состояние">
        <Alert
          type={OVERALL_ALERT[view.status]}
          showIcon
          title={`Общее состояние: ${SERVICE_STATUS_LABELS[view.status]}`}
          description={OVERALL_TEXT[view.status]}
        />
      </section>

      <section className="page-section">
        <Title level={2} className="status-heading">
          Компоненты
        </Title>
        <ul className="status-components app-content-card">
          {view.components.map(({ id, status }) => (
            <li key={id} className="status-component">
              <div>
                <Text strong>{SERVICE_COMPONENT_LABELS[id].name}</Text>
                <div>
                  <Text type="secondary" className="text-meta">
                    {SERVICE_COMPONENT_LABELS[id].description}
                  </Text>
                </div>
              </div>
              <ServiceStatusTag status={status} />
            </li>
          ))}
        </ul>
        <Text type="secondary" className="text-meta">
          Проверено: {formatDateTime(view.checkedAt)}. Страница обновляется сама раз в{' '}
          {REFETCH_INTERVAL_SECONDS} секунд.
        </Text>
      </section>
    </>
  )
}

/**
 * Статус сервиса: общее состояние и состояние API, обработки ревью и очереди задач. Открыт без
 * сессии, как «Помощь». Если сам запрос статуса не удался, страница не пустеет: API показан
 * по ошибке запроса, а про воркер и очередь, о которых сообщает только API, — «Нет данных».
 */
export function StatusPage() {
  const { data, error, errorUpdatedAt, isError, isPending, isFetching, refetch } =
    useServiceStatus()

  return (
    <PublicLayout>
      <div className="status-content">
        <Title level={1} className="page-title">
          Статус сервиса
        </Title>

        {isPending ? (
          <LoadingState label="Проверяем состояние сервиса…" />
        ) : (
          <>
            {isError && (
              <Alert
                className="status-error"
                type="warning"
                showIcon
                title="Не удалось получить статус от API"
                description="О состоянии обработки ревью и очереди задач сообщает API, поэтому для них нет данных. Страница повторит запрос сама."
                action={
                  <Button size="small" loading={isFetching} onClick={() => void refetch()}>
                    Проверить снова
                  </Button>
                }
              />
            )}
            <StatusReport
              view={isError ? viewFromFailure(error, errorUpdatedAt) : viewFromReport(data)}
            />
          </>
        )}
      </div>
    </PublicLayout>
  )
}
