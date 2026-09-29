import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { parseResponse, useTransport } from '../../../shared/api'
import { DiffFileSchema, DiffFileSummarySchema } from '../model/schema'

export const diffKeys = {
  files: (runId: string) => ['review-runs', runId, 'files'] as const,
  file: (runId: string, path: string) => ['review-runs', runId, 'diff', path] as const,
}

const runPath = (runId: string) => `/review-runs/${encodeURIComponent(runId)}`

export function useDiffFiles(runId: string, { enabled = true }: { enabled?: boolean } = {}) {
  const transport = useTransport()
  return useQuery({
    queryKey: diffKeys.files(runId),
    queryFn: async () => {
      const path = `${runPath(runId)}/files`
      return parseResponse(z.array(DiffFileSummarySchema), path, await transport.get(path))
    },
    enabled,
  })
}

/** Diff одного выбранного файла: остальные файлы не загружаются и не рендерятся. */
export function useDiffFile(runId: string, filePath: string | null) {
  const transport = useTransport()
  return useQuery({
    queryKey: diffKeys.file(runId, filePath ?? ''),
    queryFn: async () => {
      const path = `${runPath(runId)}/diff?path=${encodeURIComponent(filePath ?? '')}`
      return parseResponse(DiffFileSchema, path, await transport.get(path))
    },
    enabled: filePath !== null,
  })
}
