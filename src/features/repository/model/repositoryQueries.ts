import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  connectRepository,
  disconnectRepository,
  fetchRepositories,
  fetchRepository,
  fetchRepositorySettings,
  fetchRulesStatus,
  saveRepositorySettings,
  type ConnectRepositoryRequest,
  type RepositorySettingsUpdate,
} from '@/entities/repository'
import { ApiError, useTransport } from '@/shared/api'

export const repositoryKeys = {
  list: ['repositories', 'list'] as const,
  repository: (repositoryId: string) => ['repositories', repositoryId] as const,
  settings: (repositoryId: string) => ['repositories', repositoryId, 'settings'] as const,
  rules: (repositoryId: string) => ['repositories', repositoryId, 'rules'] as const,
}

/** Страница «Репозитории» и её соседи: все репозитории установок и `install_url`. */
export function useRepositories() {
  const transport = useTransport()
  return useQuery({
    queryKey: repositoryKeys.list,
    queryFn: () => fetchRepositories(transport),
  })
}

/**
 * Переключатель «Ревью» — вкл. `409` — успех: ревью уже включено, в том числе параллельным
 * запросом. Список перезапрашивается и после ошибки: строка могла измениться на сервере.
 */
export function useConnectRepository() {
  const transport = useTransport()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: ConnectRepositoryRequest) => {
      try {
        await connectRepository(transport, request)
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 409)) throw error
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: repositoryKeys.list }),
  })
}

/** Переключатель «Ревью» — выкл. Уже выключенный бэкенд тоже отвечает `204`. */
export function useDisconnectRepository() {
  const transport = useTransport()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (repositoryId: string) => disconnectRepository(transport, repositoryId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: repositoryKeys.list }),
  })
}

/** Заголовок экрана настроек: один репозиторий `GET /repositories/{id}`, без списка. */
export function useRepository(repositoryId: string) {
  const transport = useTransport()
  return useQuery({
    queryKey: repositoryKeys.repository(repositoryId),
    queryFn: () => fetchRepository(transport, repositoryId),
  })
}

export function useRepositorySettings(repositoryId: string) {
  const transport = useTransport()
  return useQuery({
    queryKey: repositoryKeys.settings(repositoryId),
    queryFn: () => fetchRepositorySettings(transport, repositoryId),
  })
}

export function useRulesStatus(repositoryId: string) {
  const transport = useTransport()
  return useQuery({
    queryKey: repositoryKeys.rules(repositoryId),
    queryFn: () => fetchRulesStatus(transport, repositoryId),
  })
}

export function useSaveRepositorySettings(repositoryId: string) {
  const transport = useTransport()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: RepositorySettingsUpdate) =>
      saveRepositorySettings(transport, repositoryId, settings),
    onSuccess: async (saved) => {
      // Ответ сразу в кэш: упавший рефетч не откатит форму к прежним значениям
      // при живом баннере «Настройки сохранены».
      queryClient.setQueryData(repositoryKeys.settings(repositoryId), saved)
      await queryClient.invalidateQueries({ queryKey: repositoryKeys.settings(repositoryId) })
    },
  })
}
