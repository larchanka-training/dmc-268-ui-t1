import type { SeverityThreshold } from '../model/settings'

/**
 * Подписи пресетов порога severity из задачи. Маппинг на уровни модели бэкенда не согласован
 * (open question в #28), поэтому подписи живут рядом с пресетами, а не с уровнями severity.
 */
export const SEVERITY_THRESHOLD_LABEL: Record<SeverityThreshold, string> = {
  all: 'All',
  warn_and_critical: 'Warn & Crit',
  critical_only: 'Only Critical',
}

export const SEVERITY_THRESHOLD_OPTIONS: { value: SeverityThreshold; label: string }[] = [
  { value: 'all', label: SEVERITY_THRESHOLD_LABEL.all },
  { value: 'warn_and_critical', label: SEVERITY_THRESHOLD_LABEL.warn_and_critical },
  { value: 'critical_only', label: SEVERITY_THRESHOLD_LABEL.critical_only },
]
