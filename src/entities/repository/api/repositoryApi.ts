import {
  connectRepository,
  getAvailableRepositories,
  getConnectedRepositories,
  getRepositoryHistory,
  getRepositorySettings,
  getRulesStatus,
  saveRepositorySettings as persistSettings,
} from '@/entities/repository/api/mockStore'
import {
  HistoryRunSchema,
  RepositorySettingsSchema,
  RulesStatusSchema,
} from '@/entities/repository/model/settings'
import type {
  HistoryRun,
  RepositorySettings,
  RulesStatus,
} from '@/entities/repository/model/settings'
import type { AvailableRepository, ConnectedRepository } from '@/entities/repository/model/types'
import { parseResponse } from '@/shared/api'

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchConnectedRepositories(): Promise<ConnectedRepository[]> {
  await delay()
  return getConnectedRepositories()
}

export async function fetchAvailableRepositories(): Promise<AvailableRepository[]> {
  await delay()
  return getAvailableRepositories()
}

export async function connectRepositoryById(repoId: string): Promise<ConnectedRepository> {
  await delay(500)
  return connectRepository(repoId)
}

/**
 * Mock adapter с той же границей, что будущий HTTP-клиент (FE-DEC-06): ответ store
 * проходит через Zod-схему до того, как попадёт в UI. Пути — как у ожидаемого контракта.
 */
export async function fetchRepositorySettings(repoId: string): Promise<RepositorySettings> {
  await delay()
  return parseResponse(
    RepositorySettingsSchema,
    `/repositories/${repoId}/settings`,
    getRepositorySettings(repoId),
  )
}

export async function fetchRulesStatus(repoId: string): Promise<RulesStatus> {
  await delay()
  return parseResponse(RulesStatusSchema, `/repositories/${repoId}/rules`, getRulesStatus(repoId))
}

export async function fetchRepositoryHistory(repoId: string): Promise<HistoryRun[]> {
  await delay()
  return parseResponse(
    HistoryRunSchema.array(),
    `/repositories/${repoId}/history`,
    getRepositoryHistory(repoId),
  )
}

export async function saveRepositorySettings(
  repoId: string,
  settings: RepositorySettings,
): Promise<RepositorySettings> {
  await delay(500)
  // Проверяем тело запроса до записи: store не должен принять данные вне схемы.
  const body = parseResponse(RepositorySettingsSchema, `/repositories/${repoId}/settings`, settings)
  return persistSettings(repoId, body)
}
