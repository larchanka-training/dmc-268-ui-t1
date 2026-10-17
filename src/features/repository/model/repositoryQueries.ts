import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  connectRepositoryById,
  fetchAvailableRepositories,
  fetchConnectedRepositories,
  fetchRepositoryHistory,
  fetchRepositorySettings,
  fetchRulesStatus,
  saveRepositorySettings,
} from '@/entities/repository'
import type { RepositorySettings } from '@/entities/repository'

export const repositoryKeys = {
  connected: ['repositories', 'connected'] as const,
  available: ['repositories', 'available'] as const,
  settings: (repositoryId: string) => ['repositories', repositoryId, 'settings'] as const,
  rules: (repositoryId: string) => ['repositories', repositoryId, 'rules'] as const,
  history: (repositoryId: string) => ['repositories', repositoryId, 'history'] as const,
}

export function useConnectedRepositories() {
  return useQuery({
    queryKey: repositoryKeys.connected,
    queryFn: fetchConnectedRepositories,
  })
}

export function useAvailableRepositories() {
  return useQuery({
    queryKey: repositoryKeys.available,
    queryFn: fetchAvailableRepositories,
  })
}

export function useConnectRepository() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: connectRepositoryById,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: repositoryKeys.connected })
      await queryClient.invalidateQueries({ queryKey: repositoryKeys.available })
    },
  })
}

export function useRepositorySettings(repositoryId: string) {
  return useQuery({
    queryKey: repositoryKeys.settings(repositoryId),
    queryFn: () => fetchRepositorySettings(repositoryId),
  })
}

export function useRulesStatus(repositoryId: string) {
  return useQuery({
    queryKey: repositoryKeys.rules(repositoryId),
    queryFn: () => fetchRulesStatus(repositoryId),
  })
}

export function useRepositoryHistory(repositoryId: string) {
  return useQuery({
    queryKey: repositoryKeys.history(repositoryId),
    queryFn: () => fetchRepositoryHistory(repositoryId),
  })
}

export function useSaveRepositorySettings(repositoryId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: RepositorySettings) => saveRepositorySettings(repositoryId, settings),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: repositoryKeys.settings(repositoryId) })
    },
  })
}
