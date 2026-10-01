import {
  connectRepository,
  getAvailableRepositories,
  getConnectedRepositories,
} from '@/entities/repository/api/mockStore'
import type { AvailableRepository, ConnectedRepository } from '@/entities/repository/model/types'

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
