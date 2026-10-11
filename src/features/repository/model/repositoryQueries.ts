import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  connectRepositoryById,
  fetchAvailableRepositories,
  fetchConnectedRepositories,
} from '@/entities/repository'

export const repositoryKeys = {
  connected: ['repositories', 'connected'] as const,
  available: ['repositories', 'available'] as const,
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
