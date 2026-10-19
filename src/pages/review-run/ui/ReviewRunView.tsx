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
import { FindingsList } from './FindingsList'
import { reviewKey, useReviewExtras, useReviewRun, type ReviewRunResponse } from '../model/review'

/** Событие статуса патчит прогон в кэше; замечания и публикации остаются как есть. */
function patchRun(data: ReviewRunResponse, event: RunStatusEvent): ReviewRunResponse {
  return { ...data, ...applyStatusEvent(data, event) }
}

/**
 * Экран одного прогона: получает модели из adapter и раздаёт их виджетам.
 * Живёт в `pages`: это экран предметной области, а не корень приложения (§3).
 */
export function ReviewRunView() {
  // Маршрут `/reviews/:reviewId`; id — UUID прогона на бэкенде.
  const { reviewId = '' } = useParams()
  const review = useReviewRun(reviewId)
  const extras = useReviewExtras(reviewId)
  // Ключ — в зависимостях эффекта подписки: новый массив на каждый рендер переоткрывал бы поток.
  const queryKey = useMemo(() => reviewKey(reviewId), [reviewId])
  const loadedRun = review.data
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

  const { findings, published_comments, ...run } = review.data
  // Дополнения вне контракта: пока грузятся или их нет у источника — экран без них.
  const extra = extras.data ?? null
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <RunHeader run={run} verdict={extra} />
      {!isTerminalStatus(run.status) && (
        <ConnectionNotice state={live.streamState} onRefresh={() => void live.refresh()} />
      )}
      <RunProgress run={run} seenStage={live.seenStage} />
      <ReviewSummary run={run} findings={findings} publishedComments={published_comments} />
      {extra ? (
        <ReviewWorkspace
          run={run}
          files={extra.files}
          diffsByPath={extra.diffs_by_path}
          findings={findings}
          publishedComments={published_comments}
        />
      ) : (
        <FindingsList findings={findings} publishedComments={published_comments} />
      )}
      {extra && <RunInspector actions={extra.actions} />}
    </main>
  )
}
