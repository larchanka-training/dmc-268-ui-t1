import {
  AvailableRepositoryListSchema,
  RepositorySchema,
  RepositoryListSchema,
  type AvailableRepository,
  type ConnectRepositoryRequest,
  type Repository,
} from '@/entities/repository/model/schema'
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
