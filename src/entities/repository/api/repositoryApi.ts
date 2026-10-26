import {
  AvailableRepositoryListSchema,
  RepositorySchema,
  RepositoryListSchema,
  type AvailableRepository,
  type ConnectRepositoryRequest,
  type Repository,
} from '@/entities/repository/model/schema'
import {
  RepositorySettingsSchema,
  RulesStatusSchema,
  type RepositorySettings,
  type RepositorySettingsUpdate,
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

export async function fetchRepository(
  transport: ApiTransport,
  repositoryId: string,
): Promise<Repository> {
  const path = repositoryPath(repositoryId)
  return parseResponse(RepositorySchema, path, await transport.get(path))
}

/** Ручки блока настроек — `GET/PUT …/settings` и `GET …/rules` контракта (заглушки 501). */
export function repositoryPath(repositoryId: string) {
  return `${REPOSITORIES_PATH}/${encodeURIComponent(repositoryId)}`
}

export function repositorySettingsPath(repositoryId: string) {
  return `${repositoryPath(repositoryId)}/settings`
}

export function repositoryRulesPath(repositoryId: string) {
  return `${repositoryPath(repositoryId)}/rules`
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

/** Сохранение — `PUT` полной заменой, как в контракте. */
export async function saveRepositorySettings(
  transport: ApiTransport,
  repositoryId: string,
  settings: RepositorySettingsUpdate,
): Promise<RepositorySettings> {
  const path = repositorySettingsPath(repositoryId)
  return parseResponse(RepositorySettingsSchema, path, await transport.put(path, settings))
}
