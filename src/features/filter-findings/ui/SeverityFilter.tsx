import { SEVERITIES, SEVERITY_LABEL, type ReviewFinding } from '../../../entities/review-finding'
import { useFilterFindings } from '../model/store'

/** Переключатели severity с числом замечаний каждой; ничего не выбрано — видны все. */
export function SeverityFilter({ findings }: { findings: readonly ReviewFinding[] }) {
  const { severity_filters, toggleSeverity, resetSeverities } = useFilterFindings()

  return (
    <div role="group" aria-label="Фильтр по severity" className="flex flex-wrap items-center gap-1">
      {SEVERITIES.map((severity) => {
        const count = findings.filter((finding) => finding.severity === severity).length
        const active = severity_filters.includes(severity)
        return (
          <button
            key={severity}
            type="button"
            aria-pressed={active}
            onClick={() => toggleSeverity(severity)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              active
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {SEVERITY_LABEL[severity]} · {count}
          </button>
        )
      })}
      {severity_filters.length > 0 && (
        <button
          type="button"
          onClick={resetSeverities}
          className="px-2 text-xs text-slate-500 underline hover:text-slate-900"
        >
          Сбросить
        </button>
      )}
    </div>
  )
}
