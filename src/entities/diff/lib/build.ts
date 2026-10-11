import type { DiffFile, DiffHunk, DiffLine } from '../model/schema'

/**
 * Собирает hunk из строк с префиксом `' '`, `'+'`, `'-'` или `'~'` (свёрнутый контекст) и сам
 * считает номера строк и размеры сторон: так фикстура не расходится с заголовком `@@`.
 * Идентификаторы проставляет `withLineIds` — они зависят от пути файла.
 */
export function buildHunk(
  oldStart: number,
  newStart: number,
  raw: string[],
  context = '',
): DiffHunk {
  let oldLine = oldStart
  let newLine = newStart
  const lines: DiffLine[] = raw.map((text) => {
    const prefix = text[0]
    const content = text.slice(1)
    const base = { id: '', content, is_collapsed_context: false }
    if (prefix === '+') return { ...base, kind: 'added', old_line: null, new_line: newLine++ }
    if (prefix === '-') return { ...base, kind: 'removed', old_line: oldLine++, new_line: null }
    if (prefix === ' ' || prefix === '~') {
      return {
        ...base,
        kind: 'context',
        old_line: oldLine++,
        new_line: newLine++,
        is_collapsed_context: prefix === '~',
      }
    }
    throw new Error(`Строка hunk без префикса: ${JSON.stringify(text)}`)
  })

  const oldCount = lines.filter((line) => line.kind !== 'added').length
  const newCount = lines.filter((line) => line.kind !== 'removed').length
  const tail = context ? ` ${context}` : ''

  return {
    id: '',
    header: `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${tail}`,
    old_start: oldStart,
    old_count: oldCount,
    new_start: newStart,
    new_count: newCount,
    lines,
  }
}

/** Стабильные идентификаторы hunk и строк из пути файла и позиции. */
export function withLineIds(file: DiffFile): DiffFile {
  return {
    ...file,
    hunks: file.hunks.map((item, h) => {
      const hunkId = `${file.path}#${h}`
      return {
        ...item,
        id: hunkId,
        lines: item.lines.map((line, l) => ({ ...line, id: `${hunkId}:${l}` })),
      }
    }),
  }
}
