import { ArrowRightOutlined, ExportOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import {
  isRefusedForBalance,
  isTerminalStatus,
  RUN_TRIGGER_LABELS,
  RunStatusBadge,
  VerdictBadge,
  type ReviewRun,
  type Verdict,
} from '../../../entities/review-run'
import {
  formatDateTime,
  formatDuration,
  formatEuro,
  formatNumber,
  safeExternalUrl,
  shortSha,
} from '../../../shared/lib'

function Meta({ term, wide, children }: { term: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-xs text-slate-500">{term}</dt>
      <dd className="mt-0.5 text-sm [overflow-wrap:anywhere] text-slate-900">{children}</dd>
    </div>
  )
}

export function RunHeader({ run, verdict }: { run: ReviewRun; verdict: Verdict | null }) {
  const mr = run.merge_request
  const sourceUrl = mr.url ? safeExternalUrl(mr.url) : null
  return (
    <header className="rounded-xl border border-slate-200 bg-[var(--app-surface)] p-5">
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
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
              >
                Открыть запрос на изменение
                <ExportOutlined aria-hidden />
              </a>
            )}
          </div>
          <p className="text-base text-slate-700">
            {mr.title} <span className="text-slate-500">#{mr.number}</span>
          </p>
          <p className="text-sm text-slate-500">{mr.repository.full_name}</p>
        </div>
        <VerdictBadge verdict={verdict} finished={isTerminalStatus(run.status)} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
        <Meta term="Автор">{mr.author}</Meta>
        <Meta term="Ветки" wide>
          <span className="inline-flex flex-wrap items-center gap-1 font-mono text-xs">
            {mr.source_branch}
            <ArrowRightOutlined aria-label="в" />
            {mr.target_branch}
          </span>
        </Meta>
        <Meta term="Коммит">
          <code className="font-mono">
            {run.base_sha ? `${shortSha(run.base_sha)}…` : ''}
            {shortSha(run.head_sha)}
          </code>
        </Meta>
        <Meta term="Запуск">{RUN_TRIGGER_LABELS[run.trigger]}</Meta>
        <Meta term="Поставлен">{formatDateTime(run.created_at)}</Meta>
        <Meta term="Длительность">
          {run.duration_seconds === null ? '—' : formatDuration(run.duration_seconds)}
        </Meta>
        <Meta term="Модель">{run.model ?? '—'}</Meta>
        <Meta term="Токены">{run.tokens_used === null ? '—' : formatNumber(run.tokens_used)}</Meta>
        <Meta term="Стоимость">{run.usage ? formatEuro(run.usage.cost_eur) : '—'}</Meta>
      </dl>

      {isRefusedForBalance(run) && (
        <div role="alert" className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Недостаточно средств, ревью не было</p>
          <p className="mt-1">
            Пополните баланс плательщика или назначьте плательщика на странице{' '}
            <Link to="/repositories" className="font-medium underline">
              «Репозитории»
            </Link>
            , затем запустите ревью вручную.
          </p>
        </div>
      )}

      {run.failure_reason && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {run.failure_reason}
        </p>
      )}
    </header>
  )
}
