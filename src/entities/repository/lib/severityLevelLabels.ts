import type { SeverityLevel } from '../model/settings'

/**
 * Подписи уровней severity порога — те же слова, что у замечаний
 * `entities/review-finding`, но объявлены здесь: слайсы одного слоя не зависят друг от
 * друга.
 */
export const SEVERITY_LEVEL_LABEL: Record<SeverityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const SEVERITY_LEVEL_OPTIONS: { value: SeverityLevel; label: string }[] = [
  { value: 'low', label: SEVERITY_LEVEL_LABEL.low },
  { value: 'medium', label: SEVERITY_LEVEL_LABEL.medium },
  { value: 'high', label: SEVERITY_LEVEL_LABEL.high },
  { value: 'critical', label: SEVERITY_LEVEL_LABEL.critical },
]
