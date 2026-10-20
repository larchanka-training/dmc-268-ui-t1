import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  connectRepository,
  fetchAvailableRepositories,
  fetchConnectedRepositories,
  type ConnectRepositoryRequest,
} from '@/entities/repository'
import { useTransport } from '@/shared/api'

export const repositoryKeys = {
  connected: ['repositories', 'connected'] as const,
  available: ['repositories', 'available'] as const,
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
