import { useMemo, type ReactNode } from 'react'

import { publicationsByFinding, type PublishedComment } from '../../../entities/published-comment'
import {
  groupFindingsByLine,
  ReviewCommentThread,
  SEVERITIES,
  SeverityBadge,
  type ReviewFinding,
} from '../../../entities/review-finding'
import { isRefusedForBalance, isTerminalStatus, type ReviewRun } from '../../../entities/review-run'

type Props = {
  run: ReviewRun
  findings: readonly ReviewFinding[]
  publishedComments: readonly PublishedComment[]
}

export function ReviewSummary({ run, findings, publishedComments }: Props) {
  const { unanchored } = useMemo(() => groupFindingsByLine(findings), [findings])
  const publications = useMemo(() => publicationsByFinding(publishedComments), [publishedComments])
  const inlinePublished = publishedComments.filter((comment) => comment.kind === 'inline').length
  const finished = isTerminalStatus(run.status)
  // Отменённый или упавший прогон мог опубликовать часть замечаний — полным его не выдаём.
  const partial = run.status === 'failed' || run.status === 'cancelled'

  return (
    <section
      aria-labelledby="review-summary-title"
      className="rounded-xl border border-slate-200 bg-[var(--app-surface)] p-5"
    >
      <h2 id="review-summary-title" className="text-base font-semibold text-slate-900">
        Сводка
      </h2>

      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        <SummaryItem label="Замечаний" value={findings.length} />
        {SEVERITIES.map((severity) => (
          <SummaryItem
            key={severity}
            label={<SeverityBadge severity={severity} />}
            value={findings.filter((finding) => finding.severity === severity).length}
          />
        ))}
        <SummaryItem label="Опубликовано inline" value={inlinePublished} />
        <SummaryItem label="Отброшено валидацией" value={run.rejected_findings} />
      </dl>

      {partial && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Прогон не дошёл до конца — список замечаний может быть неполным.
        </p>
      )}
      {/* Без денег ревью не было: «Замечаний нет» выдавало бы его за чистое, причина — в шапке. */}
      {findings.length === 0 && !partial && !isRefusedForBalance(run) && (
        <p className="mt-4 text-sm text-slate-600">
          {finished ? 'Замечаний нет.' : 'Ревью ещё идёт — замечания появятся по мере анализа.'}
        </p>
      )}

      {unanchored.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-slate-700">Без привязки к строке</h3>
          {unanchored.map((finding) => (
            <ReviewCommentThread
              key={finding.id}
              finding={finding}
              publication={publications.get(finding.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/** Показатель сводки: подпись (текст или бейдж) в строке одной высоты, число под ней — все на одном уровне. */
function SummaryItem({ label, value }: { label: ReactNode; value: number }) {
  return (
    <div>
      <dt className="flex h-6 items-center text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
