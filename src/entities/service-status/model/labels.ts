import type { ServiceComponent, ServiceStatus } from './schema'

/** Подписи состояний: одни и те же у общего состояния и у компонентов. */
export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  operational: 'Работает',
  degraded: 'Работает со сбоями',
  outage: 'Недоступен',
  unknown: 'Нет данных',
}

/** Компоненты на странице статуса: название и что за ним стоит для пользователя. */
export const SERVICE_COMPONENT_LABELS: Record<
  ServiceComponent,
  { name: string; description: string }
> = {
  api: { name: 'API', description: 'Кабинет, вход и приём событий из GitHub' },
  worker: { name: 'Обработка ревью', description: 'Воркер, который проводит ревью PR' },
  queue: { name: 'Очередь задач', description: 'Передаёт задачи ревью от API воркеру' },
}
