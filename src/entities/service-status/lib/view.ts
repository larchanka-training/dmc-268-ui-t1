import { ApiError, ContractError } from '@/shared/api'

import {
  SERVICE_COMPONENTS,
  SERVICE_STATUSES,
  type ComponentStatus,
  type ServiceStatus,
  type ServiceStatusReport,
} from '../model/schema'

/** То, что показывает страница: общее состояние, все три компонента по порядку и время проверки. */
export type ServiceStatusView = {
  status: ServiceStatus
  components: ComponentStatus[]
  /** Когда состояние оценено: `checked_at` ответа или момент неудачного запроса, ISO. */
  checkedAt: string
}

/** Худшее из состояний в порядке outage, degraded, unknown, operational — как сводит бэкенд. */
export function worstStatus(statuses: readonly ServiceStatus[]): ServiceStatus {
  return SERVICE_STATUSES.find((status) => statuses.includes(status)) ?? 'unknown'
}

/** Ответ API — в вид страницы: каждый известный компонент на своём месте, пропавший — «Нет данных». */
export function viewFromReport(report: ServiceStatusReport): ServiceStatusView {
  return {
    status: report.status,
    components: SERVICE_COMPONENTS.map((id) => ({
      id,
      status: report.components.find((component) => component.id === id)?.status ?? 'unknown',
    })),
    checkedAt: report.checked_at,
  }
}

/**
 * API не ответил (сеть, `5xx`, `502` от nginx при лежащем контейнере API) — он недоступен.
 * Ответил, но не так (`4xx`, ответ вне контракта) — API работает, а состояния мы не знаем.
 */
function apiStatusOnFailure(error: unknown): ServiceStatus {
  if (error instanceof ApiError) return error.status >= 500 ? 'outage' : 'unknown'
  if (error instanceof ContractError) return 'unknown'
  // Ответа нет вовсе: `fetch` бросил на сети.
  return 'outage'
}

/**
 * Запрос статуса не удался. Состояние воркера и очереди сообщает только API, поэтому про них —
 * «Нет данных»; про сам API — по ошибке запроса.
 */
export function viewFromFailure(error: unknown, failedAt: number): ServiceStatusView {
  const components: ComponentStatus[] = SERVICE_COMPONENTS.map((id) => ({
    id,
    status: id === 'api' ? apiStatusOnFailure(error) : 'unknown',
  }))
  return {
    status: worstStatus(components.map((component) => component.status)),
    components,
    checkedAt: new Date(failedAt).toISOString(),
  }
}
