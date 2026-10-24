import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import {
  applyRunEvent,
  isTerminalStatus,
  type ReviewRunListItem,
} from '../../../entities/review-run'
import { ConnectionNotice, useRunLiveStatus } from '../../../features/live-run-status'
import { ApiError } from '../../../shared/api'
import { ErrorState, LoadingState, RefreshErrorNotice } from '../../../shared/ui'
import { ReviewSummary, RunHeader, RunProgress } from '../../../widgets/review-run-view'
import { ReviewWorkspace } from '../../../widgets/review-workspace'
import { RunInspector } from '../../../widgets/run-inspector'
import { FindingsList } from './FindingsList'
import {
  reviewKey,
  useReviewDiff,
  useReviewRun,
  useReviewSteps,
  type ReviewRunResponse,
} from '../model/review'
import { runVerdict } from '../model/verdict'
import { toWorkspace } from '../model/workspace'

/** Событие прогона патчит его статус в кэше; замечания и публикации остаются как есть. */
function patchRun(data: ReviewRunResponse, event: ReviewRunListItem): ReviewRunResponse {
  return applyRunEvent(data, event)
}

/**
 * Экран одного прогона: получает модели из adapter и раздаёт их виджетам.
 * Живёт в `pages`: это экран предметной области, а не корень приложения (§3).
 */
export function ReviewRunView() {
  // Маршрут `/reviews/:reviewId`; id — UUID прогона на бэкенде.
  const { reviewId = '' } = useParams()
  const review = useReviewRun(reviewId)
  const diff = useReviewDiff(reviewId)
  const steps = useReviewSteps(reviewId)
  // Ключ — в зависимостях эффекта подписки: новый массив на каждый рендер переоткрывал бы поток.
  const queryKey = useMemo(() => reviewKey(reviewId), [reviewId])
  const loadedRun = review.data
  const findingsOfRun = loadedRun?.findings
  // Шаги в контракте пока не приходят событиями: перезапрашиваем их на каждой смене этапа,
  // чтобы текущий шаг был виден со статусом «выполняется».
  const runStatus = loadedRun?.status
  const refetchSteps = steps.refetch
  useEffect(() => {
    if (runStatus !== undefined && !isTerminalStatus(runStatus)) void refetchSteps()
  }, [runStatus, refetchSteps])
  const workspace = useMemo(
    () => (diff.data && findingsOfRun ? toWorkspace(diff.data, findingsOfRun) : null),
    [diff.data, findingsOfRun],
  )
  // Пока прогон не загружен, подписываться не на что: хук получает пустой идентификатор
  // и терминальный статус, а потому не открывает поток.
  const live = useRunLiveStatus({
    runId: loadedRun?.id ?? '',
    status: loadedRun?.status ?? 'completed',
    queryKey,
    patchCache: patchRun,
  })

  if (review.isPending) return <LoadingState label="Загружаем прогон…" />
  // Ошибка на весь экран — только когда показывать нечего. Упал перезапрос уже загруженного
  // прогона (переподключение потока, `run.finished`) — прогон остаётся, сверху плашка.
  if (review.isLoadingError && review.error instanceof ApiError && review.error.status === 404) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <ErrorState title="Прогон не найден" />
      </main>
    )
  }
  if (review.isLoadingError) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <ErrorState
          title="Не удалось загрузить прогон"
          error={review.error}
          onRetry={() => void review.refetch()}
        />
      </main>
    )
  }

  const { findings, published_comments, ...run } = review.data
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      {review.isRefetchError && (
        <RefreshErrorNotice
          title="Не удалось обновить прогон"
          onRetry={() => void review.refetch()}
        />
      )}
      <RunHeader run={run} verdict={runVerdict(run.status, findings)} />
      {!isTerminalStatus(run.status) && (
        <ConnectionNotice state={live.streamState} onRefresh={live.refresh} />
      )}
      <RunProgress run={run} seenStage={live.seenStage} />
      <ReviewSummary run={run} findings={findings} publishedComments={published_comments} />
      {/* Диффа нет, пока бэкенд его не отдаёт (501) или пока он грузится: замечания списком. */}
      {workspace ? (
        <ReviewWorkspace
          run={run}
          files={workspace.files}
          diffsByPath={workspace.diffsByPath}
          findings={findings}
          publishedComments={published_comments}
        />
      ) : (
        <FindingsList findings={findings} publishedComments={published_comments} />
      )}
      {/* Ход прогона не загрузился — ошибка с повтором в его месте; `501` — блока нет. */}
      {steps.isLoadingError ? (
        <ErrorState
          title="Не удалось загрузить ход прогона"
          error={steps.error}
          onRetry={() => void steps.refetch()}
        />
      ) : (
        steps.data && <RunInspector steps={steps.data.items} runStatus={run.status} />
      )}
    </main>
  )
}
