import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import {
  applyStatusEvent,
  isTerminalStatus,
  type RunStatusEvent,
} from '../../../entities/review-run'
import { ConnectionNotice, useRunLiveStatus } from '../../../features/live-run-status'
import { ApiError } from '../../../shared/api'
import { ErrorState, LoadingState } from '../../../shared/ui'
import { ReviewSummary, RunHeader, RunProgress } from '../../../widgets/review-run-view'
import { ReviewWorkspace } from '../../../widgets/review-workspace'
import { RunInspector } from '../../../widgets/run-inspector'
import { mockReviewKey, useMockReview, type MockReviewState } from '../model/mockReview'

/** Событие статуса патчит прогон в кэше, остальные данные экрана остаются как есть. */
function patchRun(data: MockReviewState, event: RunStatusEvent): MockReviewState {
  return { ...data, run: applyStatusEvent(data.run, event) }
}

/**
 * Экран одного прогона: получает модели из adapter и раздаёт их виджетам.
 * Живёт в `pages`: это экран предметной области, а не корень приложения (§3).
 */
export function ReviewRunView() {
  // Маршрут `/reviews/:reviewId`; id — UUID прогона на бэкенде.
  const { reviewId = '' } = useParams()
  const review = useMockReview(reviewId)
  // Ключ — в зависимостях эффекта подписки: новый массив на каждый рендер переоткрывал бы поток.
  const queryKey = useMemo(() => mockReviewKey(reviewId), [reviewId])
  const loadedRun = review.data?.run
  // Пока прогон не загружен, подписываться не на что: хук получает пустой идентификатор
  // и терминальный статус, а потому не открывает поток.
  const live = useRunLiveStatus({
    runId: loadedRun?.id ?? '',
    status: loadedRun?.status ?? 'completed',
    queryKey,
    patchCache: patchRun,
  })

  if (review.isPending) return <LoadingState label="Загружаем прогон…" />
  if (review.error instanceof ApiError && review.error.status === 404) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <ErrorState title="Прогон не найден" />
      </main>
    )
  }
  if (review.isError) {
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

  const { run, files, diffs_by_path, findings, published_comments, actions } = review.data
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <RunHeader run={run} />
      {!isTerminalStatus(run.status) && (
        <ConnectionNotice state={live.streamState} onRefresh={() => void live.refresh()} />
      )}
      <RunProgress run={run} seenStage={live.seenStage} />
      <ReviewSummary run={run} findings={findings} publishedComments={published_comments} />
      <ReviewWorkspace
        run={run}
        files={files}
        diffsByPath={diffs_by_path}
        findings={findings}
        publishedComments={published_comments}
      />
      <RunInspector actions={actions} />
    </main>
  )
}
