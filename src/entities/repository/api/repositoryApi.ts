import {
  RepositorySchema,
  RepositoryListSchema,
  type ConnectRepositoryRequest,
  type Repository,
  type RepositoryList,
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

/** Первая страница списка: больше 200 бэкенд всё равно не отдаст. */
const PAGE = '?limit=200'

/** Все репозитории установок, видимые пользователю, подключённые и нет, и `install_url`. */
export async function fetchRepositories(transport: ApiTransport): Promise<RepositoryList> {
  const path = REPOSITORIES_PATH + PAGE
  return parseResponse(RepositoryListSchema, path, await transport.get(path))
}

/** Включает ревью. `409 REPOSITORY_ALREADY_CONNECTED` вызывающий считает успехом. */
export async function connectRepository(
  transport: ApiTransport,
  request: ConnectRepositoryRequest,
): Promise<Repository> {
  const path = REPOSITORIES_PATH
  return parseResponse(RepositorySchema, path, await transport.post(path, request))
}

/** Выключает ревью: `204` и тогда, когда оно уже выключено. */
export async function disconnectRepository(
  transport: ApiTransport,
  repositoryId: string,
): Promise<void> {
  await transport.delete(repositoryPath(repositoryId))
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
