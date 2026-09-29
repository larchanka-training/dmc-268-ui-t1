import { useMemo } from 'react'

import {
  FindingCard,
  groupFindingsByLine,
  SEVERITIES,
  SeverityBadge,
  type PublishedComment,
  type ReviewFinding,
} from '../../../entities/review-finding'
import { isTerminalStatus, type ReviewRun } from '../../../entities/review-run'

type Props = {
  run: ReviewRun
  findings: readonly ReviewFinding[]
  publishedComments: readonly PublishedComment[]
}

export function ReviewSummary({ run, findings, publishedComments }: Props) {
  const { unanchored } = useMemo(() => groupFindingsByLine(findings), [findings])
  const publications = useMemo(
    () => new Map(publishedComments.map((comment) => [comment.finding_id, comment])),
    [publishedComments],
  )
  const inlinePublished = publishedComments.filter((comment) => comment.kind === 'inline').length
  const finished = isTerminalStatus(run.status)
  // Отменённый или упавший прогон мог опубликовать часть замечаний — полным его не выдаём.
  const partial = run.status === 'failed' || run.status === 'cancelled'

  return (
    <section
      aria-labelledby="review-summary-title"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 id="review-summary-title" className="text-base font-semibold text-slate-900">
        Сводка
      </h2>

      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <dt className="text-xs text-slate-500">Замечаний</dt>
          <dd className="text-2xl font-semibold text-slate-900">{findings.length}</dd>
        </div>
        {SEVERITIES.map((severity) => (
          <div key={severity}>
            <dt>
              <SeverityBadge severity={severity} />
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">
              {findings.filter((finding) => finding.severity === severity).length}
            </dd>
          </div>
        ))}
        <div>
          <dt className="text-xs text-slate-500">Опубликовано inline</dt>
          <dd className="text-lg font-semibold text-slate-900">{inlinePublished}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Отброшено валидацией</dt>
          <dd className="text-lg font-semibold text-slate-900">{run.rejected_findings}</dd>
        </div>
      </dl>

      {partial && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Прогон не дошёл до конца — список замечаний может быть неполным.
        </p>
      )}
      {findings.length === 0 && !partial && (
        <p className="mt-4 text-sm text-slate-600">
          {finished ? 'Замечаний нет.' : 'Ревью ещё идёт — замечания появятся по мере анализа.'}
        </p>
      )}

      {unanchored.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-slate-700">Без привязки к строке</h3>
          {unanchored.map((finding) => (
            <FindingCard
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
