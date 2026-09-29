import { lazy, Suspense, useMemo } from 'react'

import { useDiffFile, useDiffFiles } from '../../../entities/diff'
import type { PublishedComment, ReviewFinding } from '../../../entities/review-finding'
import type { ReviewRun } from '../../../entities/review-run'
import { EmptyState, ErrorBoundary, ErrorState, LoadingState } from '../../../shared/ui'
import { resolveSelectedPath, useReviewWorkspace } from '../model/store'
import { FileList } from './FileList'
import { ViewModeToggle } from './ViewModeToggle'

// Просмотрщик тянет подсветку всех языков highlight.js — грузим его отдельным чанком,
// чтобы заголовок и сводка прогона не ждали его загрузки.
const DiffViewer = lazy(() =>
  import('./DiffViewer').then((module) => ({ default: module.DiffViewer })),
)

type Props = {
  run: ReviewRun
  findings: readonly ReviewFinding[]
  publishedComments: readonly PublishedComment[]
}

export function ReviewWorkspace({ run, findings, publishedComments }: Props) {
  // Без base revision дифф прогона не воспроизвести (FRONTEND_ARCHITECTURE.md §9.1).
  const snapshotAvailable = run.base_sha !== null
  const files = useDiffFiles(run.id, { enabled: snapshotAvailable })
  const { selectedPath, viewMode, selectFile, setViewMode } = useReviewWorkspace()

  const paths = useMemo(() => files.data?.map((file) => file.path) ?? [], [files.data])
  const activePath = resolveSelectedPath(selectedPath, paths)
  const diff = useDiffFile(run.id, activePath)

  const publications = useMemo(
    () =>
      new Map(
        publishedComments.flatMap((comment) =>
          comment.finding_id === null ? [] : [[comment.finding_id, comment] as const],
        ),
      ),
    [publishedComments],
  )
  const findingsCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const finding of findings) {
      counts.set(finding.file_path, (counts.get(finding.file_path) ?? 0) + 1)
    }
    return counts
  }, [findings])
  const fileFindings = useMemo(
    () => findings.filter((finding) => finding.file_path === activePath),
    [findings, activePath],
  )

  if (!snapshotAvailable) {
    return (
      <EmptyState>
        Для этого прогона не сохранена базовая ревизия — дифф в момент ревью недоступен.
      </EmptyState>
    )
  }
  if (files.isPending) return <LoadingState label="Загружаем список файлов…" />
  if (files.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить список файлов"
        error={files.error}
        onRetry={() => void files.refetch()}
      />
    )
  }
  if (files.data.length === 0) return <EmptyState>В прогоне нет изменённых файлов.</EmptyState>

  return (
    <section aria-label="Изменения" className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="rounded-xl border border-slate-200 bg-white p-2 lg:sticky lg:top-4 lg:self-start">
        <FileList
          files={files.data}
          findingsCount={findingsCount}
          selectedPath={activePath}
          onSelect={selectFile}
        />
      </aside>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="truncate font-mono text-sm font-medium text-slate-900">{activePath}</h2>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>

        {diff.isPending && <LoadingState label="Загружаем дифф…" />}
        {diff.isError && (
          <ErrorState
            title="Не удалось загрузить дифф файла"
            error={diff.error}
            onRetry={() => void diff.refetch()}
          />
        )}
        {diff.isSuccess && (
          <ErrorBoundary
            key={activePath}
            fallback={(error, reset) => (
              <ErrorState title="Не удалось отобразить дифф файла" error={error} onRetry={reset} />
            )}
          >
            <Suspense fallback={<LoadingState label="Загружаем просмотрщик диффа…" />}>
              <DiffViewer
                file={diff.data}
                findings={fileFindings}
                publications={publications}
                viewMode={viewMode}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </section>
  )
}
