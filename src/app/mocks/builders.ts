import type { DiffHunk, DiffLine } from '../../entities/diff'

/**
 * Собирает hunk из строк с префиксом `' '`, `'+'` или `'-'` и сам считает номера строк
 * и размеры сторон: так фикстура не расходится с заголовком `@@`.
 */
export function hunk(oldStart: number, newStart: number, raw: string[], context = ''): DiffHunk {
  let oldLine = oldStart
  let newLine = newStart
  const lines: DiffLine[] = raw.map((text) => {
    const prefix = text[0]
    const content = text.slice(1)
    if (prefix === '+') return { kind: 'added', old_line: null, new_line: newLine++, content }
    if (prefix === '-') return { kind: 'removed', old_line: oldLine++, new_line: null, content }
    if (prefix === ' ') {
      return { kind: 'context', old_line: oldLine++, new_line: newLine++, content }
    }
    throw new Error(`Строка hunk без префикса: ${JSON.stringify(text)}`)
  })

  const oldCount = lines.filter((line) => line.kind !== 'added').length
  const newCount = lines.filter((line) => line.kind !== 'removed').length
  const tail = context ? ` ${context}` : ''

  return {
    header: `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${tail}`,
    old_start: oldStart,
    old_count: oldCount,
    new_start: newStart,
    new_count: newCount,
    lines,
  }
}
