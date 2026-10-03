import { SEVERITY_LABEL } from '../model/labels'
import type { Severity } from '../model/schema'

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-200 text-amber-900',
  low: 'bg-sky-100 text-sky-800',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${SEVERITY_CLASS[severity]}`}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  )
}
