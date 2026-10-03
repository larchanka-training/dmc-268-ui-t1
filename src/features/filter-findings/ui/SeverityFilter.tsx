import { Button } from 'antd'

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
          <Button
            key={severity}
            size="small"
            shape="round"
            type={active ? 'primary' : 'default'}
            aria-pressed={active}
            onClick={() => toggleSeverity(severity)}
            className="text-xs font-medium"
          >
            {SEVERITY_LABEL[severity]} · {count}
          </Button>
        )
      })}
      {severity_filters.length > 0 && (
        <Button size="small" type="link" onClick={resetSeverities} className="text-xs">
          Сбросить
        </Button>
      )}
    </div>
  )
}
