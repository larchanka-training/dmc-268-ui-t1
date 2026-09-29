import {
  connectRepository,
  getAvailableRepositories,
  getConnectedRepositories,
} from '@/api/mock/data'
import type { AvailableRepository, ConnectedRepository } from '@/types/repository'

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

export async function mockFetchConnectedRepositories(): Promise<ConnectedRepository[]> {
  await delay()
  return getConnectedRepositories()
}

export async function mockFetchAvailableRepositories(): Promise<AvailableRepository[]> {
  await delay()
  return getAvailableRepositories()
}

export async function mockConnectRepository(repoId: string): Promise<ConnectedRepository> {
  await delay(500)
  return connectRepository(repoId)
}
