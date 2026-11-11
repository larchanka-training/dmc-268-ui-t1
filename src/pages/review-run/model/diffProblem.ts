import { ApiError } from '../../../shared/api'

/**
 * Причины, по которым бэкенд не отдаст дифф и при повторе: ответ не изменится, пока не
 * изменится сам прогон или репозиторий. Повтора у них нет — ни кнопкой, ни запросом.
 */
const PERMANENT_DIFF_PROBLEMS: Readonly<Record<string, string>> = {
  DIFF_TOO_LARGE: 'Дифф слишком большой для показа',
  DIFF_UNAVAILABLE: 'Дифф прогона недоступен',
  COMMIT_NOT_FOUND: 'Коммитов прогона больше нет',
  REPOSITORY_NOT_IN_INSTALLATION: 'Приложение не установлено на репозиторий',
  // Срок хранения прошёл, пока экран был открыт: прогон загружен ещё с `diff_expired_at = null`.
  DIFF_EXPIRED: 'Дифф удалён по сроку хранения',
}

export type DiffProblem = {
  title: string
  /** `false` — причина постоянная, «Повторить» не показываем. */
  retryable: boolean
}

/** Что сказать о диффе, который не загрузился: по `code` ответа, текст — `detail`. */
export function diffProblem(error: unknown): DiffProblem {
  const permanent = error instanceof ApiError && error.code && PERMANENT_DIFF_PROBLEMS[error.code]
  if (permanent) return { title: permanent, retryable: false }
  return { title: 'Не удалось загрузить дифф', retryable: true }
}
