import type { Verdict } from '../model/schema'

const VERDICT_VIEW: Record<Verdict, { label: string; className: string }> = {
  approve: {
    label: 'Можно мёржить',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  comment: { label: 'Есть замечания', className: 'border-amber-200 bg-amber-50 text-amber-900' },
  request_changes: { label: 'Нужны правки', className: 'border-red-200 bg-red-50 text-red-800' },
}

type Props = {
  verdict: Verdict | null
  /** Прогон завершён: вердикта, которого нет сейчас, уже не будет. */
  finished: boolean
}

/** Итог ревью. До завершения прогона его нет. */
export function VerdictBadge({ verdict, finished }: Props) {
  if (verdict === null) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500">
        {finished ? 'Вердикта нет' : 'Вердикт появится после завершения'}
      </div>
    )
  }

  const view = VERDICT_VIEW[verdict]
  return (
    <div
      role="group"
      aria-label={`Вердикт: ${view.label}`}
      className={`flex items-center gap-4 rounded-lg border px-4 py-2 ${view.className}`}
    >
      <span className="text-sm font-semibold">{view.label}</span>
    </div>
  )
}
