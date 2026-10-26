/**
 * Нормализация фильтра веток под ограничения контракта `RepositorySettingsUpdate`:
 * каждый паттерн — непустой после обрезки пробелов, без повторов, не больше 50 штук и
 * не длиннее 200 символов. UI не выдумывает значения — только чистит ввод.
 */
export const MAX_BRANCH_PATTERNS = 50
export const MAX_BRANCH_PATTERN_LENGTH = 200

/** Обрезает пробелы, отбрасывает пустые и убирает повторы, сохраняя порядок. */
export function normalizeBranchFilter(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of values) {
    const value = raw.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }
  return result
}

/** Сообщение о нарушении ограничений контракта или `null`, если значение допустимо.
 *  Лимиты считаются по нормализованному списку: сохраняются всё равно только чистые
 *  паттерны, черновик формы — сырой ввод. */
export function branchFilterProblem(values: string[]): string | null {
  const normalized = normalizeBranchFilter(values)
  if (normalized.length > MAX_BRANCH_PATTERNS) return `Не больше ${MAX_BRANCH_PATTERNS} паттернов`
  const tooLong = normalized.find((value) => value.length > MAX_BRANCH_PATTERN_LENGTH)
  if (tooLong) return `Паттерн — не длиннее ${MAX_BRANCH_PATTERN_LENGTH} символов`
  return null
}
