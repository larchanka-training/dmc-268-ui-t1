import type { FindingCategory, Severity } from './schema'

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const CATEGORY_LABEL: Record<FindingCategory, string> = {
  security: 'Безопасность',
  correctness: 'Корректность',
  performance: 'Производительность',
  readability: 'Читаемость',
}
