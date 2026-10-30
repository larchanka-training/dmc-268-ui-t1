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

/**
 * Строка списка `GET /repositories` (`RepositoryListItem`): репозиторий установки GitHub App,
 * подключённый или нет. `id` есть, если запись в сервисе есть, в том числе у выключенного.
 */
export const RepositoryListItemSchema = z.object({
  provider: ProviderSchema,
  provider_id: z.string(),
  full_name: z.string(),
  default_branch: z.string(),
  connected: z.boolean(),
  id: z.string().nullable(),
  can_connect: z.boolean(),
  connected_at: z.string().nullable(),
})

/** Список и адрес экрана установки приложения; `install_url` — `null`, если slug неизвестен. */
export const RepositoryListSchema = z.object({
  items: z.array(RepositoryListItemSchema),
  install_url: z.string().nullable(),
})

export type Repository = z.infer<typeof RepositorySchema>
export type RepositoryListItem = z.infer<typeof RepositoryListItemSchema>
export type RepositoryList = z.infer<typeof RepositoryListSchema>
/** Тело подключения — тип контракта как есть: его собирает фронт, проверять нечего. */
export type ConnectRepositoryRequest = ApiSchemas['ConnectRepositoryRequest']

// Разбор ответов совпадает с контрактом поле в поле; разойдутся — упадёт typecheck.
const contractCheck: [
  MatchesContract<z.infer<typeof RepositorySchema>, ApiSchemas['RepositoryResponse']>,
  MatchesContract<z.infer<typeof RepositoryListSchema>, ApiSchemas['RepositoryListResponse']>,
] = [true, true]
void contractCheck
