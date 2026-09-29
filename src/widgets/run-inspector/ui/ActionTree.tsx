import type { ActionStatus, ReviewRunAction } from '../../../entities/review-run-action'
import { formatDateTime, formatDuration } from '../../../shared/lib'

const STATUS_VIEW: Record<ActionStatus, { label: string; className: string }> = {
  running: { label: 'выполняется', className: 'text-sky-700' },
  completed: { label: 'готово', className: 'text-emerald-700' },
  failed: { label: 'ошибка', className: 'text-red-700' },
}

type Props = {
  /** Уже упорядочены по `position`. */
  actions: readonly ReviewRunAction[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Хронология действий прогона; соседние одинаковые tools визуально группируются. */
export function ActionTree({ actions, selectedId, onSelect }: Props) {
  return (
    <ol aria-label="Действия прогона" className="space-y-0.5">
      {actions.map((action, index) => {
        const status = STATUS_VIEW[action.status]
        const repeated = index > 0 && actions[index - 1].tool === action.tool
        return (
          <li key={action.id} className={repeated ? 'pl-4' : undefined}>
            <button
              type="button"
              onClick={() => onSelect(action.id)}
              aria-current={action.id === selectedId ? 'true' : undefined}
              className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm ${
                action.id === selectedId
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="w-6 text-right font-mono text-xs text-slate-400">
                {action.position}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{action.tool}</span>
              <span className={`text-xs ${status.className}`}>{status.label}</span>
              <span className="w-12 shrink-0 text-right text-xs text-slate-500">
                {action.duration_seconds === null ? '—' : formatDuration(action.duration_seconds)}
              </span>
              <span className="sr-only">начато {formatDateTime(action.started_at)}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
