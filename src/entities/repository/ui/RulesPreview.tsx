import { TextWithCode } from '@/shared/ui'
import type { RulesStatus } from '../model/settings'

/**
 * Превью распарсенных правил `.review/rules.md` в режиме read-only: секции с пунктами,
 * директивы игнорирования помечены тегом «ignore». Парсинга markdown во фронтенде нет —
 * adapter отдаёт готовые секции (design.md). Без файла — предупреждение о дефолтных
 * правилах. Read-only достигается отсутствием полей ввода.
 */
export function RulesPreview({ status }: { status: RulesStatus }) {
  if (!status.present) {
    return (
      <p
        role="note"
        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
      >
        <TextWithCode text="Используются дефолтные правила, создайте `.review/rules.md`" />
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {status.sections.map((section) => (
        <section key={section.title}>
          <h4 className="mb-1 text-sm font-semibold text-slate-700">{section.title}</h4>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-slate-600">
            {section.entries.map((entry) => (
              <li key={`${entry.kind}:${entry.text}`}>
                {entry.kind === 'ignore' && (
                  <span className="mr-1.5 inline-flex rounded bg-slate-100 px-1.5 py-px font-mono text-xs text-slate-600">
                    ignore
                  </span>
                )}
                <TextWithCode text={entry.text} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
