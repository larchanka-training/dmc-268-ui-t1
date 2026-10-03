import { ErrorState, LoadingState } from '../../../shared/ui'
import { ReviewSummary, RunHeader } from '../../../widgets/review-run-view'
import { ReviewWorkspace } from '../../../widgets/review-workspace'
import { RunInspector } from '../../../widgets/run-inspector'
import { useMockReview } from '../model/mockReview'

/**
 * Экран одного прогона: получает модели из adapter и раздаёт их виджетам.
 * Живёт в `pages`: это экран предметной области, а не корень приложения (§3).
 */
export function ReviewRunView() {
  const review = useMockReview()

  if (review.isPending) return <LoadingState label="Загружаем прогон…" />
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
