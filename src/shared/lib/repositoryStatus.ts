import type { RepositoryConnectionStatus } from '@/entities/repository'

export const repositoryStatusLabel: Record<RepositoryConnectionStatus, string> = {
  connected: 'Подключён',
  syncing: 'Синхронизация',
  error: 'Ошибка',
}
