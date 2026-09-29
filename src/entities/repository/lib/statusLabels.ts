import type { RepositoryConnectionStatus } from '@/entities/repository/model/types'

export const repositoryStatusLabel: Record<RepositoryConnectionStatus, string> = {
  connected: 'Подключён',
  syncing: 'Синхронизация',
  error: 'Ошибка',
}
