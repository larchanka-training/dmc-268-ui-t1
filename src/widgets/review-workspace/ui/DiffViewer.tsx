import { DiffModeEnum, DiffView, SplitSide } from '@git-diff-view/react'
import '@git-diff-view/react/styles/diff-view-pure.css'
import { useMemo } from 'react'

import {
  collapseContext,
  indexLines,
  toUnifiedDiff,
  type CollapsedGap,
  type DiffFile,
} from '../../../entities/diff'
import {
  anchorLine,
  groupFindingsByLine,
  ReviewCommentThread,
  type ReviewFinding,
} from '../../../entities/review-finding'
import { EmptyState } from '../../../shared/ui'
import type { DiffViewMode } from '../model/store'

type Props = {
  file: DiffFile
  /** Замечания этого файла, уже отфильтрованные по severity. */
  findings: readonly ReviewFinding[]
  publications: ReadonlyMap<string, { published_at: string }>
  viewMode: DiffViewMode
  expandedLineIds: ReadonlySet<string>
  onExpand: (lineIds: readonly string[]) => void
}

type LineExtras = { findings: ReviewFinding[]; gaps: CollapsedGap[] }

/**
 * Показывает один выбранный файл: замечания AI под строками своей стороны, свёрнутый контекст
 * с кнопкой раскрытия. Строка с замечанием не прячется в свёрнутом блоке.
 */
export function DiffViewer({
  file,
  findings,
  publications,
  viewMode,
  expandedLineIds,
  onExpand,
}: Props) {
  const allLines = useMemo(() => indexLines(file), [file])

  const { shown, gaps } = useMemo(() => {
    const expanded = new Set([...expandedLineIds, ...linesWithFindings(file, findings)])
    const collapsed = collapseContext(file, expanded)
    return { shown: collapsed.file, gaps: collapsed.gaps }
  }, [file, findings, expandedLineIds])

  const hunks = useMemo(() => [toUnifiedDiff(shown)], [shown])
  const shownLines = useMemo(() => indexLines(shown), [shown])

  const { extendData, outsideDiff } = useMemo(() => {
    const { byLine } = groupFindingsByLine(findings)
    const extras: Record<'old' | 'new', Map<number, LineExtras>> = {
      old: new Map(),
      new: new Map(),
    }
    const slot = (side: 'old' | 'new', line: number) => {
      const existing = extras[side].get(line) ?? { findings: [], gaps: [] }
      extras[side].set(line, existing)
      return existing
    }
    for (const side of ['old', 'new'] as const) {
      for (const [line, items] of byLine[side]) {
        if (shownLines[side].has(line)) slot(side, line).findings.push(...items)
      }
    }
    for (const gap of gaps) slot(gap.anchorSide, gap.anchorLine).gaps.push(gap)

    // Замечание на строке, которой нет ни в одном hunk, иначе потерялось бы молча.
    const outside = findings.filter((finding) => {
      const line = anchorLine(finding)
      return line !== null && !allLines[finding.side].has(line)
    })
    return {
      extendData: { oldFile: toExtendData(extras.old), newFile: toExtendData(extras.new) },
      outsideDiff: outside,
    }
  }, [findings, gaps, shownLines, allLines])

  if (file.is_binary) {
    return <EmptyState>Бинарный файл — текстового диффа нет.</EmptyState>
  }
  if (file.hunks.length === 0) {
    return <EmptyState>В файле нет изменённых строк.</EmptyState>
  }

  const renderExtras = (
    { findings: items, gaps: lineGaps }: LineExtras,
    side: 'old' | 'new',
    line: number,
  ) => (
    <div className="space-y-2 bg-slate-50 p-2 font-sans">
      {items.map((finding) => (
        <ReviewCommentThread
          key={finding.id}
          finding={finding}
          publication={publications.get(finding.id)}
          anchorContent={allLines[side].get(line)}
        />
      ))}
      {lineGaps.map((gap) => (
        <button
          key={gap.lineIds[0]}
          type="button"
          onClick={() => onExpand(gap.lineIds)}
          className="w-full rounded-md border border-dashed border-sky-300 bg-sky-50 px-3 py-1 text-left text-xs font-medium text-sky-800 hover:bg-sky-100"
        >
          {gap.position === 'before' ? '↑' : '↕'} Показать {gap.lineIds.length} скрытых строк
          {gap.position === 'before' ? ' выше' : ''}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-3">
      {outsideDiff.length > 0 && (
        <section aria-label="Замечания вне показанного диффа" className="space-y-2">
          <p className="text-xs text-slate-500">
            Эти замечания относятся к строкам, которых нет в показанных изменениях:
          </p>
          {outsideDiff.map((finding) => (
            <ReviewCommentThread
              key={finding.id}
              finding={finding}
              publication={publications.get(finding.id)}
            />
          ))}
        </section>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <DiffView<LineExtras>
          // Новый ключ на смену файла: внутреннее состояние просмотрщика не переносится.
          key={file.path}
          data={{
            oldFile: { fileName: file.previous_path ?? file.path, fileLang: file.language },
            newFile: { fileName: file.path, fileLang: file.language },
            hunks,
          }}
          extendData={extendData}
          renderExtendLine={({ data, side, lineNumber }) =>
            renderExtras(data, side === SplitSide.old ? 'old' : 'new', lineNumber)
          }
          diffViewMode={viewMode === 'side_by_side' ? DiffModeEnum.Split : DiffModeEnum.Unified}
          diffViewHighlight
          diffViewWrap
          diffViewTheme="light"
          diffViewFontSize={13}
        />
      </div>
    </div>
  )
}

/** Свёрнутые строки, к которым привязано замечание: их нельзя прятать. */
function linesWithFindings(file: DiffFile, findings: readonly ReviewFinding[]): string[] {
  const anchors = new Set(findings.map((finding) => `${finding.side}:${anchorLine(finding)}`))
  return file.hunks.flatMap((hunk) =>
    hunk.lines
      .filter(
        (line) =>
          line.is_collapsed_context &&
          (anchors.has(`old:${line.old_line}`) || anchors.has(`new:${line.new_line}`)),
      )
      .map((line) => line.id),
  )
}

function toExtendData(
  byLine: ReadonlyMap<number, LineExtras>,
): Record<string, { data: LineExtras }> {
  const result: Record<string, { data: LineExtras }> = {}
  for (const [line, data] of byLine) result[String(line)] = { data }
  return result
}
