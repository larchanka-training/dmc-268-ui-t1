import { useEffect, useRef } from 'react'
import { useParams } from 'react-router'

import { useFindings } from '../../../entities/review-finding'
import {
  isTerminalStatus,
  RUN_POLL_INTERVAL_MS,
  RunHeader,
  useReviewRun,
} from '../../../entities/review-run'
import { ApiError } from '../../../shared/api'
import { ErrorState, LoadingState } from '../../../shared/ui'
import { ReviewSummary } from '../../../widgets/review-summary'
import { ReviewWorkspace } from '../../../widgets/review-workspace'

export function ReviewRunPage() {
  const { runId = '' } = useParams()
  const run = useReviewRun(runId)
  const finished = run.data !== undefined && isTerminalStatus(run.data.status)
  // Пока прогон идёт, замечания появляются по ходу публикации — опрашиваем и их.
  const findings = useFindings(runId, { refetchInterval: finished ? false : RUN_POLL_INTERVAL_MS })

  // На переходе в терминальный статус забираем финальный набор замечаний один раз.
  const { refetch: refetchFindings } = findings
  const wasRunning = useRef(false)
  useEffect(() => {
    if (run.data === undefined) return
    if (finished && wasRunning.current) void refetchFindings()
    wasRunning.current = !finished
  }, [finished, run.data, refetchFindings])

  if (run.isPending) return <LoadingState label="Загружаем прогон…" />
  if (run.isError) {
    const notFound = run.error instanceof ApiError && run.error.status === 404
    return (
      <main className="mx-auto max-w-7xl p-6">
        <ErrorState
          title={notFound ? 'Прогон не найден' : 'Не удалось загрузить прогон'}
          error={notFound ? undefined : run.error}
          onRetry={notFound ? undefined : () => void run.refetch()}
        />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <RunHeader run={run.data} />

      {findings.isPending && <LoadingState label="Загружаем замечания…" />}
      {findings.isError && (
        <ErrorState
          title="Не удалось загрузить замечания"
          error={findings.error}
          onRetry={() => void findings.refetch()}
        />
      )}
      {findings.isSuccess && (
        <>
          <ReviewSummary
            run={run.data}
            findings={findings.data.findings}
            publishedComments={findings.data.published_comments}
          />
          <ReviewWorkspace
            run={run.data}
            findings={findings.data.findings}
            publishedComments={findings.data.published_comments}
          />
        </>
      )}
    </main>
  )
}
