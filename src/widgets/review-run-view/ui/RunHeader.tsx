import type { ReactNode } from 'react'

import {
  isTerminalStatus,
  RunStatusBadge,
  VerdictBadge,
  type ReviewRun,
  type RunTrigger,
} from '../../../entities/review-run'
import {
  formatDateTime,
  formatDuration,
  formatNumber,
  safeExternalUrl,
  shortSha,
} from '../../../shared/lib'

const TRIGGER_LABEL: Record<RunTrigger, string> = {
  webhook: 'Вебхук',
  manual: 'Вручную',
  mention: 'Упоминание',
}

function Meta({ term, wide, children }: { term: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-xs text-slate-500">{term}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  )
}

export function RunHeader({ run }: { run: ReviewRun }) {
  const sourceUrl = run.change_request ? safeExternalUrl(run.change_request.url) : null
  const mr = run.merge_request
  return (
    <header className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">Прогон ревью</h1>
            <RunStatusBadge status={run.status} />
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                Открыть источник ↗
              </a>
            )}
          </div>
          {mr && <p className="text-base text-slate-700">{mr.title}</p>}
        </div>
        <VerdictBadge
          verdict={run.verdict}
          score={run.score}
          finished={isTerminalStatus(run.status)}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {mr && (
          <>
            <Meta term="Автор">{mr.author}</Meta>
            <Meta term="Ветки" wide>
              <span className="font-mono text-xs">
                {mr.source_branch} → {mr.target_branch}
              </span>
            </Meta>
          </>
        )}
        <Meta term="Коммит">
          <code className="font-mono">
            {run.base_sha ? `${shortSha(run.base_sha)}…` : ''}
            {shortSha(run.head_sha)}
          </code>
        </Meta>
        <Meta term="Запуск">{TRIGGER_LABEL[run.trigger]}</Meta>
        <Meta term="Поставлен">{formatDateTime(run.created_at)}</Meta>
        <Meta term="Длительность">
          {run.duration_seconds === null ? '—' : formatDuration(run.duration_seconds)}
        </Meta>
        <Meta term="Модель">{run.model ?? '—'}</Meta>
        <Meta term="Токены">{run.tokens_used === null ? '—' : formatNumber(run.tokens_used)}</Meta>
      </dl>

      {run.failure_reason && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {run.failure_reason}
        </p>
      )}
    </header>
  )
}
