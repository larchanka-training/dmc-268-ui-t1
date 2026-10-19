import { STAGE_LABEL, type ReviewRunStep, type StepStatus } from '../../../entities/review-run-step'
import { formatDateTime, formatDuration, formatNumber } from '../../../shared/lib'
import { EmptyState } from '../../../shared/ui'

const STATUS_VIEW: Record<StepStatus, { label: string; className: string }> = {
  running: { label: 'выполняется', className: 'text-sky-700' },
  completed: { label: 'готово', className: 'text-emerald-700' },
  failed: { label: 'ошибка', className: 'text-red-700' },
}

/** Ход прогона: шаги воркера по порядку — этап, статус, время, токены, код ошибки. */
export function RunInspector({ steps }: { steps: readonly ReviewRunStep[] }) {
  return (
    <section
      aria-labelledby="run-inspector-title"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 id="run-inspector-title" className="text-base font-semibold text-slate-900">
        Ход прогона
      </h2>
      {steps.length === 0 ? (
        <div className="mt-3">
          <EmptyState>Шагов прогона пока нет.</EmptyState>
        </div>
      ) : (
        <ol aria-label="Шаги прогона" className="mt-3 space-y-1 text-sm">
          {steps.map((step, index) => {
            const status = STATUS_VIEW[step.status]
            return (
              <li
                key={`${step.stage}-${index}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span className="min-w-40 text-slate-900">{STAGE_LABEL[step.stage]}</span>
                <span className={`text-xs ${status.className}`}>{status.label}</span>
                <span className="text-xs text-slate-500">
                  {step.duration_seconds === null ? '—' : formatDuration(step.duration_seconds)}
                </span>
                {step.tokens_used !== null && (
                  <span className="text-xs text-slate-500">
                    {formatNumber(step.tokens_used)} токенов
                  </span>
                )}
                {step.error_code && (
                  <span role="alert" className="font-mono text-xs text-red-700">
                    {step.error_code}
                  </span>
                )}
                <span className="sr-only">начат {formatDateTime(step.started_at)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
