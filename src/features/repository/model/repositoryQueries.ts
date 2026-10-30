import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
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
  connect: ['repositories', 'connect'] as const,
  disconnect: ['repositories', 'disconnect'] as const,
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
 * Переключатель «Ревью» — вкл. `409 REPOSITORY_ALREADY_CONNECTED` — успех: ревью уже
 * включено, в том числе параллельным запросом. Другой `409` — ошибка. Список перезапрашивается и после ошибки: строка могла измениться на сервере.
 */
export function useConnectRepository() {
  const transport = useTransport()
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: repositoryKeys.connect,
    mutationFn: async (request: ConnectRepositoryRequest) => {
      try {
        await connectRepository(transport, request)
      } catch (error) {
        const alreadyConnected =
          error instanceof ApiError &&
          error.status === 409 &&
          error.code === 'REPOSITORY_ALREADY_CONNECTED'
        if (!alreadyConnected) throw error
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
    mutationKey: repositoryKeys.disconnect,
    mutationFn: (repositoryId: string) => disconnectRepository(transport, repositoryId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: repositoryKeys.list }),
  })
}

/**
 * Строки, у которых переключатель ждёт ответа. Из кэша мутаций, а не из `useMutation`: новый
 * вызов `mutate` у того же хука забывает предыдущий, и спиннер первой строки пропал бы.
 */
export function usePendingReviewToggles() {
  const connecting = useMutationState({
    filters: { mutationKey: repositoryKeys.connect, status: 'pending' },
    // Переменные мутации с этим ключом — всегда тело `useConnectRepository`.
    select: (mutation) => (mutation.state.variables as ConnectRepositoryRequest).provider_id,
  })
  const disconnecting = useMutationState({
    filters: { mutationKey: repositoryKeys.disconnect, status: 'pending' },
    select: (mutation) => mutation.state.variables as string,
  })
  return { connecting, disconnecting }
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
