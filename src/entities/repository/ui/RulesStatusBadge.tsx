import { TextWithCode } from '@/shared/ui'
import type { RulesStatus } from '../model/settings'

/**
 * Бейдж статуса `.review/rules.md`: применяются кастомные правила репозитория или
 * дефолтные. Рядом — ветка, из которой взят статус, и путь к файлу.
 */
export function RulesStatusBadge({ status }: { status: RulesStatus }) {
  const view = status.present
    ? { label: 'Кастомные правила', className: 'bg-emerald-100 text-emerald-800' }
    : { label: 'Дефолтные правила', className: 'bg-amber-100 text-amber-800' }

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
