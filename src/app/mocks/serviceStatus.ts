import type { ApiSchemas } from '../../shared/api/contract'

/**
 * Статус сервиса для `GET /status` по типу контракта: всё работает. Время проверки — момент
 * запроса без миллисекунд, как отдаёт бэкенд; по нему видно, что страница опрашивает статус.
 */
export function mockServiceStatus(now = Date.now()): ApiSchemas['ServiceStatusResponse'] {
  return {
    status: 'operational',
    components: [
      { id: 'api', status: 'operational' },
      { id: 'worker', status: 'operational' },
      { id: 'queue', status: 'operational' },
    ],
    checked_at: new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  }
}
