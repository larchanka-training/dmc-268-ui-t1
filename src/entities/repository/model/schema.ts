import { z } from 'zod'

import type { ApiSchemas, MatchesContract } from '@/shared/api/contract'

const ProviderSchema = z.enum(['github', 'gitlab'])

// Поля в snake_case — как отвечает бэкенд (контракт, `RepositoryResponse`).
export const RepositorySchema = z.object({
  id: z.string(),
  provider: ProviderSchema,
  full_name: z.string(),
  provider_id: z.string(),
  default_branch: z.string(),
  auto_review_enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const RepositoryListSchema = z.object({ items: z.array(RepositorySchema) })

/** Репозиторий установки GitHub App, который можно подключить (`AvailableRepositoryResponse`). */
export const AvailableRepositorySchema = z.object({
  provider: ProviderSchema,
  provider_id: z.string(),
  full_name: z.string(),
  default_branch: z.string(),
  already_connected: z.boolean(),
  /**
   * Роль admin или maintain: без неё подключение ответит отказом — кнопки нет (#45).
   * Без поля (бэкенд до api#233, например после отката) — кнопка как раньше: права
   * проверит сам бэкенд.
   */
  can_connect: z.boolean().default(true),
})

export const AvailableRepositoryListSchema = z.object({
  items: z.array(AvailableRepositorySchema),
})

export type Repository = z.infer<typeof RepositorySchema>
export type AvailableRepository = z.infer<typeof AvailableRepositorySchema>
/** Тело подключения — тип контракта как есть: его собирает фронт, проверять нечего. */
export type ConnectRepositoryRequest = ApiSchemas['ConnectRepositoryRequest']

// Разбор ответов совпадает с контрактом поле в поле; разойдутся — упадёт typecheck.
const contractCheck: [
  MatchesContract<z.infer<typeof RepositoryListSchema>, ApiSchemas['RepositoryListResponse']>,
  MatchesContract<
    z.infer<typeof AvailableRepositoryListSchema>,
    ApiSchemas['AvailableRepositoryListResponse']
  >,
] = [true, true]
void contractCheck
