import { TextWithCode } from '@/shared/ui'
import type { RepoRule, RejectedRule, RulesLoadStatus, RulesStatus } from '../model/settings'

/**
 * Любой исход, кроме загруженного, — дефолтный фоллбэк (api#49): ревью идёт по стандартным
 * критериям. У отсутствующего файла к тому же есть предложение создать его.
 */
const FALLBACK_TEXT: Record<Exclude<RulesLoadStatus, 'loaded'>, string> = {
  absent: 'Используются дефолтные правила, создайте `.review/rules.md`',
  too_large: 'Файл `.review/rules.md` больше лимита — ревью идёт по стандартным критериям',
  unavailable: 'Не удалось получить `.review/rules.md` — ревью идёт по стандартным критериям',
}

/** Паттерн области действия правила: моноширинный чип вида «pattern: …». */
function GlobChip({ kind, value }: { kind: 'pattern' | 'exclude'; value: string }) {
  return (
    <span className="inline-flex rounded bg-slate-100 px-1.5 py-px font-mono text-xs text-slate-600">
      {kind}: {value}
    </span>
  )
}

function RuleBlock({ rule }: { rule: RepoRule }) {
  return (
    <section>
      <h4 className="mb-1 text-sm font-semibold text-slate-700">{rule.name}</h4>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {rule.patterns.map((pattern) => (
          <GlobChip key={`pattern:${pattern}`} kind="pattern" value={pattern} />
        ))}
        {rule.excludes.map((exclude) => (
          <GlobChip key={`exclude:${exclude}`} kind="exclude" value={exclude} />
        ))}
      </div>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-slate-600">
        {rule.checks.map((check) => (
          <li key={check}>
            <TextWithCode text={check} />
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Разделы, не ставшие правилом: бэкенд отклонил их с причиной — показываем как есть. */
function RejectedRules({ rejected }: { rejected: RejectedRule[] }) {
  if (rejected.length === 0) return null

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <p className="font-medium">Отклонённые разделы — не применяются:</p>
      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5">
        {rejected.map((rule) => (
          <li key={rule.name}>
            {rule.name} — {rule.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Превью распарсенных правил `.review/rules.md` в режиме read-only: правило — имя, паттерны
 * области действия и нумерованные проверки (формат api#49); отклонённые разделы — с
 * причиной. Парсинга markdown во фронтенде нет — adapter отдаёт готовые правила. Read-only
 * достигается отсутствием полей ввода.
 */
export function RulesPreview({ status }: { status: RulesStatus }) {
  if (status.status !== 'loaded') {
    return (
      <p
        role="note"
        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
      >
        <TextWithCode text={FALLBACK_TEXT[status.status]} />
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {status.rules.map((rule) => (
        <RuleBlock key={rule.name} rule={rule} />
      ))}
      <RejectedRules rejected={status.rejected} />
    </div>
  )
}
