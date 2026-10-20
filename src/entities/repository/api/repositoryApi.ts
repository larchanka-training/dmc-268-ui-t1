import {
  AvailableRepositoryListSchema,
  RepositorySchema,
  RepositoryListSchema,
  type AvailableRepository,
  type ConnectRepositoryRequest,
  type Repository,
} from '@/entities/repository/model/schema'
import {
  HistoryRunSchema,
  RepositorySettingsSchema,
  RulesStatusSchema,
  type HistoryRun,
  type RepositorySettings,
  type RulesStatus,
} from '@/entities/repository/model/settings'
import { parseResponse, type ApiTransport } from '@/shared/api'

export const REPOSITORIES_PATH = '/repositories'
export const AVAILABLE_REPOSITORIES_PATH = '/repositories/available'

/** Первая страница подключённых: больше 200 бэкенд всё равно не отдаст. */
const PAGE = '?limit=200'

export async function fetchConnectedRepositories(transport: ApiTransport): Promise<Repository[]> {
  const path = REPOSITORIES_PATH + PAGE
  return parseResponse(RepositoryListSchema, path, await transport.get(path)).items
}

export async function fetchAvailableRepositories(
  transport: ApiTransport,
): Promise<AvailableRepository[]> {
  const path = AVAILABLE_REPOSITORIES_PATH
  return parseResponse(AvailableRepositoryListSchema, path, await transport.get(path)).items
}

export async function connectRepository(
  transport: ApiTransport,
  request: ConnectRepositoryRequest,
): Promise<Repository> {
  const path = REPOSITORIES_PATH
  return parseResponse(RepositorySchema, path, await transport.post(path, request))
}

/**
 * Пути блока настроек. Ручек в контракте бэкенда ещё нет (#28, домен api#49): форма ответа
 * закреплена в `model/settings.ts` и станет схемой этих ручек, когда они появятся.
 */
export function repositorySettingsPath(repositoryId: string) {
  return `${REPOSITORIES_PATH}/${encodeURIComponent(repositoryId)}/settings`
}

export function repositoryRulesPath(repositoryId: string) {
  return `${REPOSITORIES_PATH}/${encodeURIComponent(repositoryId)}/rules`
}

export function repositoryHistoryPath(repositoryId: string) {
  return `${REPOSITORIES_PATH}/${encodeURIComponent(repositoryId)}/history`
}

export async function fetchRepositorySettings(
  transport: ApiTransport,
  repositoryId: string,
): Promise<RepositorySettings> {
  const path = repositorySettingsPath(repositoryId)
  return parseResponse(RepositorySettingsSchema, path, await transport.get(path))
}

export async function fetchRulesStatus(
  transport: ApiTransport,
  repositoryId: string,
): Promise<RulesStatus> {
  const path = repositoryRulesPath(repositoryId)
  return parseResponse(RulesStatusSchema, path, await transport.get(path))
}

export async function fetchRepositoryHistory(
  transport: ApiTransport,
  repositoryId: string,
): Promise<HistoryRun[]> {
  const path = repositoryHistoryPath(repositoryId)
  return parseResponse(HistoryRunSchema.array(), path, await transport.get(path))
}

export async function saveRepositorySettings(
  transport: ApiTransport,
  repositoryId: string,
  settings: RepositorySettings,
): Promise<RepositorySettings> {
  const path = repositorySettingsPath(repositoryId)
  return parseResponse(RepositorySettingsSchema, path, await transport.post(path, settings))
}
