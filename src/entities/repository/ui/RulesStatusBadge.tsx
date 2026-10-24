import { TextWithCode } from '@/shared/ui'
import type { RulesLoadStatus, RulesStatus } from '../model/settings'

/**
 * Вид бейджа для каждого исхода загрузки (`RulesStatusResponse` контракта): зелёный —
 * только `loaded`. `empty` — файл есть, но ни один раздел не стал правилом: ревью идёт
 * по дефолтным.
 */
const STATUS_VIEW: Record<RulesLoadStatus, { label: string; className: string }> = {
  loaded: { label: 'Кастомные правила', className: 'bg-emerald-100 text-emerald-800' },
  empty: { label: 'Правила не применяются', className: 'bg-amber-100 text-amber-800' },
  absent: { label: 'Дефолтные правила', className: 'bg-amber-100 text-amber-800' },
  too_large: { label: 'Файл правил слишком большой', className: 'bg-amber-100 text-amber-800' },
  unavailable: { label: 'Правила недоступны', className: 'bg-slate-100 text-slate-600' },
}

/**
 * Бейдж статуса `.review/rules.md`: один из пяти исходов загрузки — применяются кастомные
 * правила или дефолтные. Рядом — ветка, из которой взят статус, и путь к файлу.
 */
export function RulesStatusBadge({ status }: { status: RulesStatus }) {
  const view = STATUS_VIEW[status.status]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${view.className}`}
      >
        {view.label}
      </span>
      <span className="text-xs text-slate-500">
        ветка: {status.branch} · файл: <TextWithCode text={`\`${status.path}\``} />
      </span>
    </div>
  )
}
