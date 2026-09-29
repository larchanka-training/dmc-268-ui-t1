import type { RepositoryConnectionStatus } from '@/types/repository'

export const repositoryStatusLabel: Record<RepositoryConnectionStatus, string> = {
  connected: 'Подключён',
  syncing: 'Синхронизация',
  error: 'Ошибка',
}
