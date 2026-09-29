import { DiffModeEnum, DiffView, SplitSide } from '@git-diff-view/react'
import '@git-diff-view/react/styles/diff-view-pure.css'
import { useMemo } from 'react'

import { indexLines, toUnifiedDiff, type DiffFile } from '../../../entities/diff'
import {
  anchorLine,
  FindingCard,
  groupFindingsByLine,
  type PublishedComment,
  type ReviewFinding,
} from '../../../entities/review-finding'
import { EmptyState } from '../../../shared/ui'
import type { DiffViewMode } from '../model/store'

type Props = {
  file: DiffFile
  /** Замечания этого файла. */
  findings: readonly ReviewFinding[]
  publications: ReadonlyMap<string, PublishedComment>
  viewMode: DiffViewMode
}

type LineFindings = { findings: ReviewFinding[] }

/** Показывает один выбранный файл и замечания AI под строками, к которым они привязаны. */
export function DiffViewer({ file, findings, publications, viewMode }: Props) {
  const lines = useMemo(() => indexLines(file), [file])
  const hunks = useMemo(() => [toUnifiedDiff(file)], [file])

  const { extendData, outsideDiff } = useMemo(() => {
    const { byLine } = groupFindingsByLine(findings)
    const extend = {
      oldFile: toExtendData(byLine.old, lines.old),
      newFile: toExtendData(byLine.new, lines.new),
    }
    // Замечание на строке, которой нет в показанных hunk'ах, иначе потерялось бы молча.
    const outside = findings.filter((finding) => {
      const line = anchorLine(finding)
      return line !== null && !lines[finding.side].has(line)
    })
    return { extendData: extend, outsideDiff: outside }
  }, [findings, lines])

  if (file.is_binary) {
    return <EmptyState>Бинарный файл — построчного диффа нет.</EmptyState>
  }
  if (file.hunks.length === 0) {
    return <EmptyState>В файле нет изменённых строк.</EmptyState>
  }

  const renderCards = (items: ReviewFinding[], side: 'old' | 'new', lineNumber: number) => (
    <div className="space-y-2 bg-slate-50 p-2 font-sans">
      {items.map((finding) => (
        <FindingCard
          key={finding.id}
          finding={finding}
          publication={publications.get(finding.id)}
          anchorContent={lines[side].get(lineNumber)}
        />
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
            <FindingCard
              key={finding.id}
              finding={finding}
              publication={publications.get(finding.id)}
            />
          ))}
        </section>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <DiffView<LineFindings>
          // Новый ключ на смену файла: внутреннее состояние просмотрщика не переносится.
          key={file.path}
          data={{
            oldFile: { fileName: file.previous_path ?? file.path, fileLang: file.language },
            newFile: { fileName: file.path, fileLang: file.language },
            hunks,
          }}
          extendData={extendData}
          renderExtendLine={({ data, side, lineNumber }) =>
            renderCards(data.findings, side === SplitSide.old ? 'old' : 'new', lineNumber)
          }
          diffViewMode={viewMode === 'split' ? DiffModeEnum.Split : DiffModeEnum.Unified}
          diffViewHighlight
          diffViewWrap
          diffViewTheme="light"
          diffViewFontSize={13}
        />
      </div>
    </div>
  )
}

function toExtendData(
  byLine: ReadonlyMap<number, ReviewFinding[]>,
  shown: ReadonlyMap<number, string>,
): Record<string, { data: LineFindings }> {
  const result: Record<string, { data: LineFindings }> = {}
  for (const [line, findings] of byLine) {
    if (shown.has(line)) result[String(line)] = { data: { findings } }
  }
  return result
}
