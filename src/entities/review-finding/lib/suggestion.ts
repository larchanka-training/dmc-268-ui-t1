export type SuggestionLine = { kind: 'removed' | 'added' | 'context'; text: string }

/**
 * Строки блока «Предлагаемое исправление». Модель присылает правку
 * унифицированным диффом (`prompts/review/output-format.md` бэкенда), но бывает
 * и просто код замены. Дифф — если каждая строка начинается с `-`, `+` или
 * пробела (пустая — контекст) и есть хоть одна `-`/`+`; пара заголовков
 * `---`/`+++` в начале и строки `@@` пропускаются. Иначе текст — замена строки замечания.
 * Код замены, где каждая строка начинается с `-` (список YAML), тоже сойдёт за
 * дифф: модель так не пишет, если держит формат.
 */
export function parseSuggestion(suggestion: string, anchorContent?: string): SuggestionLine[] {
  const lines = suggestion.replace(/\n$/, '').split(/\r?\n/)
  // Заголовок — только пара `--- `/`+++ `: одиночная `--- x` — удалённая строка `-- x`.
  const header = lines[0]?.startsWith('--- ') && lines[1]?.startsWith('+++ ') ? 2 : 0
  const body = lines.slice(header).filter((line) => !line.startsWith('@@'))
  const isDiff =
    body.some((line) => /^[-+]/.test(line)) && body.every((line) => /^([-+ ]|$)/.test(line))
  if (isDiff) {
    return body.map((line) => ({
      kind: line.startsWith('-') ? 'removed' : line.startsWith('+') ? 'added' : 'context',
      text: line.slice(1),
    }))
  }
  return [
    ...(anchorContent !== undefined ? [{ kind: 'removed' as const, text: anchorContent }] : []),
    ...suggestion.split('\n').map((text) => ({ kind: 'added' as const, text })),
  ]
}
