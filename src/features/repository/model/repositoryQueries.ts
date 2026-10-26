import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  connectRepository,
  fetchAvailableRepositories,
  fetchConnectedRepositories,
  fetchRepository,
  fetchRepositorySettings,
  fetchRulesStatus,
  saveRepositorySettings,
  type ConnectRepositoryRequest,
  type RepositorySettingsUpdate,
} from '@/entities/repository'
import { useTransport } from '@/shared/api'

export const repositoryKeys = {
  connected: ['repositories', 'connected'] as const,
  available: ['repositories', 'available'] as const,
  repository: (repositoryId: string) => ['repositories', repositoryId] as const,
  settings: (repositoryId: string) => ['repositories', repositoryId, 'settings'] as const,
  rules: (repositoryId: string) => ['repositories', repositoryId, 'rules'] as const,
}

export function useConnectedRepositories() {
  const transport = useTransport()
  return useQuery({
    queryKey: repositoryKeys.connected,
    queryFn: () => fetchConnectedRepositories(transport),
  })
}

export function useAvailableRepositories() {
  const transport = useTransport()
  return useQuery({
    queryKey: repositoryKeys.available,
    queryFn: () => fetchAvailableRepositories(transport),
  })
}

export function useConnectRepository() {
  const transport = useTransport()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ConnectRepositoryRequest) => connectRepository(transport, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: repositoryKeys.connected })
      await queryClient.invalidateQueries({ queryKey: repositoryKeys.available })
    },
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
      // Флаг авто-ревью — та же колонка репозитория: список и заголовок обновляются тоже.
      await queryClient.invalidateQueries({ queryKey: repositoryKeys.repository(repositoryId) })
      await queryClient.invalidateQueries({ queryKey: repositoryKeys.connected })
    },
  })
}
