import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  connectRepository,
  fetchAvailableRepositories,
  fetchConnectedRepositories,
  fetchRepositoryHistory,
  fetchRepositorySettings,
  fetchRulesStatus,
  saveRepositorySettings,
  type ConnectRepositoryRequest,
  type RepositorySettings,
} from '@/entities/repository'
import { useTransport } from '@/shared/api'

export const repositoryKeys = {
  connected: ['repositories', 'connected'] as const,
  available: ['repositories', 'available'] as const,
  settings: (repositoryId: string) => ['repositories', repositoryId, 'settings'] as const,
  rules: (repositoryId: string) => ['repositories', repositoryId, 'rules'] as const,
  history: (repositoryId: string) => ['repositories', repositoryId, 'history'] as const,
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

export function useRepositoryHistory(repositoryId: string) {
  const transport = useTransport()
  return useQuery({
    queryKey: repositoryKeys.history(repositoryId),
    queryFn: () => fetchRepositoryHistory(transport, repositoryId),
  })
}

export function useSaveRepositorySettings(repositoryId: string) {
  const transport = useTransport()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: RepositorySettings) =>
      saveRepositorySettings(transport, repositoryId, settings),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: repositoryKeys.settings(repositoryId) })
    },
  })
}
