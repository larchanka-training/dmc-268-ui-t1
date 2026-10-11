import { isKnownStatus, isTerminalStatus, type KnownRunStatus } from '../model/schema'

const STATUS_VIEW: Record<KnownRunStatus, { label: string; className: string }> = {
  queued: { label: 'В очереди', className: 'bg-slate-100 text-slate-700' },
  building_context: { label: 'Сбор контекста', className: 'bg-sky-100 text-sky-800' },
  analysing: { label: 'Анализ', className: 'bg-sky-100 text-sky-800' },
  publishing: { label: 'Публикация', className: 'bg-sky-100 text-sky-800' },
  completed: { label: 'Завершён', className: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Ошибка', className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Отменён', className: 'bg-slate-200 text-slate-700' },
}

export function RunStatusBadge({ status }: { status: string }) {
  // Незнакомый статус показываем как есть и считаем прогон идущим.
  const view = isKnownStatus(status)
    ? STATUS_VIEW[status]
    : { label: status, className: 'bg-sky-100 text-sky-800' }
  const inProgress = !isTerminalStatus(status)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${view.className}`}
    >
      {inProgress && (
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" />
      )}
      {view.label}
    </span>
  )
}
