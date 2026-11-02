import { z } from 'zod'

import type { ApiSchemas, MatchesContract } from '@/shared/api/contract'

/** Состояния из `ServiceStatus` контракта, от худшего к лучшему — так бэкенд сводит общее. */
export const SERVICE_STATUSES = ['outage', 'degraded', 'unknown', 'operational'] as const

export type ServiceStatus = (typeof SERVICE_STATUSES)[number]

/** Компоненты из `ServiceComponent` контракта в порядке страницы: так их отдаёт и бэкенд. */
export const SERVICE_COMPONENTS = ['api', 'worker', 'queue'] as const

export type ServiceComponent = (typeof SERVICE_COMPONENTS)[number]

function isServiceComponent(id: string): id is ServiceComponent {
  return (SERVICE_COMPONENTS as readonly string[]).includes(id)
}

// Незнакомое состояние (enum бэкенда вырос) читается как «Нет данных», а не роняет страницу.
const ServiceStatusSchema = z.enum(SERVICE_STATUSES).catch('unknown')

/** Состояние одного компонента (`ComponentStatusResponse` контракта; сверка — ниже). */
export type ComponentStatus = { id: ServiceComponent; status: ServiceStatus }

/**
 * Ответ `GET /api/v1/status` (`ServiceStatusResponse` контракта). Компонент, которого фронт
 * ещё не знает, отбрасывается: подписи для него нет, а известные показываются как есть.
 */
export const ServiceStatusResponseSchema = z.object({
  status: ServiceStatusSchema,
  components: z
    .array(z.object({ id: z.string(), status: ServiceStatusSchema }))
    .transform((items) =>
      items.filter((item): item is ComponentStatus => isServiceComponent(item.id)),
    ),
  checked_at: z.string(),
})

export type ServiceStatusReport = z.infer<typeof ServiceStatusResponseSchema>

// Разобранный ответ совпадает с типом контракта поле в поле; разойдутся — упадёт typecheck.
const contractCheck: MatchesContract<ServiceStatusReport, ApiSchemas['ServiceStatusResponse']> =
  true
void contractCheck
const componentContractCheck: MatchesContract<
  ComponentStatus,
  ApiSchemas['ComponentStatusResponse']
> = true
void componentContractCheck
