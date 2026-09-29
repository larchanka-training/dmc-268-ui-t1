import { lazy, Suspense, useMemo } from 'react'

import type { DiffFile, DiffFileSummary } from '../../../entities/diff'
import { publicationsByFinding, type PublishedComment } from '../../../entities/published-comment'
import type { ReviewFinding } from '../../../entities/review-finding'
import type { ReviewRun } from '../../../entities/review-run'
import {
  applySeverityFilter,
  SeverityFilter,
  useFilterFindings,
} from '../../../features/filter-findings'
import { EmptyState, ErrorBoundary, ErrorState, LoadingState } from '../../../shared/ui'
import { resolveSelectedPath, useReviewWorkspace } from '../model/store'
import { FileList } from './FileList'
import { ViewModeToggle } from './ViewModeToggle'

// Просмотрщик тянет подсветку всех языков highlight.js — грузим его отдельным чанком,
// чтобы шапка и сводка прогона не ждали его загрузки.
const DiffViewer = lazy(() =>
  import('./DiffViewer').then((module) => ({ default: module.DiffViewer })),
)

type Props = {
  run: ReviewRun
  files: readonly DiffFileSummary[]
  diffsByPath: Readonly<Record<string, DiffFile>>
  findings: readonly ReviewFinding[]
  publishedComments: readonly PublishedComment[]
}

/** Соединяет список файлов, viewer и замечания; копию диффа не хранит (§5.2 архитектуры). */
export function ReviewWorkspace({ run, files, diffsByPath, findings, publishedComments }: Props) {
  const {
    selected_file,
    view_mode,
    expanded_context_line_ids,
    selectFile,
    setViewMode,
    expandContext,
  } = useReviewWorkspace()
  const severities = useFilterFindings((state) => state.severity_filters)

  const paths = useMemo(() => files.map((file) => file.path), [files])
  const activePath = resolveSelectedPath(selected_file, paths)
  const diff = activePath === null ? undefined : diffsByPath[activePath]

  const publications = useMemo(() => publicationsByFinding(publishedComments), [publishedComments])
  const visibleFindings = useMemo(
    () => applySeverityFilter(findings, severities),
    [findings, severities],
  )
  const findingsCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const finding of visibleFindings) {
      counts.set(finding.file_path, (counts.get(finding.file_path) ?? 0) + 1)
    }
    return counts
  }, [visibleFindings])
  const fileFindings = useMemo(
    () => visibleFindings.filter((finding) => finding.file_path === activePath),
    [visibleFindings, activePath],
  )
  const expanded = useMemo(() => new Set(expanded_context_line_ids), [expanded_context_line_ids])

  // Без base revision дифф прогона не воспроизвести.
  if (run.base_sha === null) {
    return (
      <EmptyState>
        Для этого прогона не сохранена базовая ревизия — дифф в момент ревью недоступен.
      </EmptyState>
    )
  }
  if (files.length === 0) return <EmptyState>В прогоне нет изменённых файлов.</EmptyState>

  return (
    <section aria-label="Изменения" className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="rounded-xl border border-slate-200 bg-white p-2 lg:sticky lg:top-4 lg:self-start">
        <FileList
          files={files}
          findingsCount={findingsCount}
          selectedPath={activePath}
          onSelect={selectFile}
        />
      </aside>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="truncate font-mono text-sm font-medium text-slate-900">{activePath}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <SeverityFilter findings={findings} />
            <ViewModeToggle value={view_mode} onChange={setViewMode} />
          </div>
        </div>

        {diff === undefined ? (
          <ErrorState title="Для выбранного файла нет диффа в данных прогона" />
        ) : (
          <ErrorBoundary
            key={activePath}
            fallback={(error, reset) => (
              <ErrorState title="Не удалось отобразить дифф файла" error={error} onRetry={reset} />
            )}
          >
            <Suspense fallback={<LoadingState label="Загружаем просмотрщик диффа…" />}>
              <DiffViewer
                file={diff}
                findings={fileFindings}
                publications={publications}
                viewMode={view_mode}
                expandedLineIds={expanded}
                onExpand={expandContext}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </section>
  )
}
