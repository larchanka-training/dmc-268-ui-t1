import {
  RepositoryPayerSchema,
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

/** Больше 200 за страницу бэкенд не отдаёт; страница короче — последняя. */
const PAGE_LIMIT = 200
// shortcut: не больше 50 страниц (10 000 репозиториев) — защита от бэкенда, который перестал
// учитывать `offset` и отдаёт одну и ту же полную страницу.
const MAX_PAGES = 50

/**
 * Все репозитории установок, видимые пользователю, подключённые и нет: страницы подряд, пока
 * страница полная. `install_url` — из первой.
 */
export async function fetchRepositories(transport: ApiTransport): Promise<RepositoryList> {
  const fetchPage = async (offset: number) => {
    const path = `${REPOSITORIES_PATH}?limit=${PAGE_LIMIT}&offset=${offset}`
    return parseResponse(RepositoryListSchema, path, await transport.get(path))
  }
  const first = await fetchPage(0)
  const items = [...first.items]
  let page = first
  let pages = 1
  while (page.items.length === PAGE_LIMIT && pages < MAX_PAGES) {
    page = await fetchPage(items.length)
    items.push(...page.items)
    pages += 1
  }
  // Страницы режутся из кэша бэкенда на 30 с: на его границе строка может прийти дважды.
  const unique = [...new Map(items.map((r) => [`${r.provider}:${r.provider_id}`, r])).values()]
  return { items: unique, install_url: first.install_url }
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

/**
 * «Платить за этот репозиторий»: плательщиком становится вызывающий. Без роли admin или
 * maintain — `403 REPOSITORY_MANAGE_REQUIRED`, невидимый или неподключённый — `404`.
 */
export async function takeOverPayment(transport: ApiTransport, repositoryId: string) {
  const path = `${repositoryPath(repositoryId)}/payer`
  return parseResponse(RepositoryPayerSchema, path, await transport.post(path, undefined))
}

/** «Перестать платить»: `204`; не плательщику и при повторе — `404 REPOSITORY_NOT_FOUND`. */
export async function stopPayment(transport: ApiTransport, repositoryId: string): Promise<void> {
  await transport.delete(`${repositoryPath(repositoryId)}/payer`)
}

export async function fetchRepository(
  transport: ApiTransport,
  repositoryId: string,
): Promise<Repository> {
  const path = repositoryPath(repositoryId)
  return parseResponse(RepositorySchema, path, await transport.get(path))
}

/** Ручки блока настроек — `GET/PUT …/settings` и `GET …/rules` контракта. */
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
