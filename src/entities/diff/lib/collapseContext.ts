import type { DiffFile, DiffHunk, DiffLine } from '../model/schema'

/** Свёрнутый блок контекста и строка, под которой стоит кнопка его раскрытия. */
export type CollapsedGap = {
  /** Идентификаторы скрытых строк: раскрытие добавляет их все в `expanded_context_line_ids`. */
  lineIds: string[]
  hunkId: string
  /** Видимая строка-якорь новой стороны. */
  anchorLine: number
  /** Блок идёт после якоря или перед ним — когда в начале hunk видимой строки выше нет. */
  position: 'after' | 'before'
}

/**
 * Прячет свёрнутые контекстные строки, которые не раскрыты. Hunk со скрытым блоком
 * посередине делится на два: номера строк в заголовках `@@` остаются верными, а
 * просмотрщику не нужно знать о свёртке.
 */
export function collapseContext(
  file: DiffFile,
  expanded: ReadonlySet<string>,
): { file: DiffFile; gaps: CollapsedGap[] } {
  const gaps: CollapsedGap[] = []
  const hunks = file.hunks.flatMap((hunk) => {
    const runs = splitHunk(hunk, expanded)
    // Hunk из одного свёрнутого блока показываем целиком: иначе на месте изменения пусто.
    if (runs.visible.every((run) => run.length === 0)) return [hunk]
    gaps.push(...runs.gaps)
    return runs.visible.filter((run) => run.length > 0).map((lines, i) => toHunk(hunk, lines, i))
  })
  return { file: { ...file, hunks }, gaps }
}

function splitHunk(hunk: DiffHunk, expanded: ReadonlySet<string>) {
  const visible: DiffLine[][] = [[]]
  const gaps: CollapsedGap[] = []
  let hidden: DiffLine[] = []

  const closeHidden = (next: DiffLine | undefined) => {
    if (hidden.length === 0) return
    const current = visible[visible.length - 1]
    const before = [...current].reverse().find((line) => line.new_line !== null)
    const anchor = before ?? next
    if (anchor?.new_line != null) {
      gaps.push({
        lineIds: hidden.map((line) => line.id),
        hunkId: hunk.id,
        anchorLine: anchor.new_line,
        position: before ? 'after' : 'before',
      })
    }
    hidden = []
    if (current.length > 0) visible.push([])
  }

  for (const line of hunk.lines) {
    if (line.is_collapsed_context && !expanded.has(line.id)) {
      hidden.push(line)
      continue
    }
    closeHidden(line)
    visible[visible.length - 1].push(line)
  }
  closeHidden(undefined)
  return { visible, gaps }
}

function toHunk(source: DiffHunk, lines: DiffLine[], index: number): DiffHunk {
  const oldCount = lines.filter((line) => line.kind !== 'added').length
  const newCount = lines.filter((line) => line.kind !== 'removed').length
  const oldStart = lines.find((line) => line.old_line !== null)?.old_line ?? source.old_start
  const newStart = lines.find((line) => line.new_line !== null)?.new_line ?? source.new_start
  const context = index === 0 ? (source.header.match(/^@@[^@]*@@(.*)$/)?.[1] ?? '') : ''
  return {
    ...source,
    id: index === 0 ? source.id : `${source.id}~${index}`,
    header: `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${context}`,
    old_start: oldStart,
    old_count: oldCount,
    new_start: newStart,
    new_count: newCount,
    lines,
  }
}
