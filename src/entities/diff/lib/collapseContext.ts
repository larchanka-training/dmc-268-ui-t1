import type { DiffFile, DiffHunk, DiffLine } from '../model/schema'

/** Свёрнутый блок контекста и строка, под которой стоит кнопка его раскрытия. */
export type CollapsedGap = {
  /** Идентификаторы скрытых строк: раскрытие добавляет их все в `expanded_context_line_ids`. */
  lineIds: string[]
  hunkId: string
  /**
   * Видимая строка-якорь: на новой стороне, если она там есть. Удалённая строка есть только
   * на старой — тогда кнопка встаёт под ней, иначе блок между удалениями остался бы без кнопки.
   */
  anchorSide: 'old' | 'new'
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
    const before = current[current.length - 1]
    const anchor = anchorOf(before ?? next)
    if (anchor) {
      gaps.push({
        lineIds: hidden.map((line) => line.id),
        hunkId: hunk.id,
        ...anchor,
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

function anchorOf(
  line: DiffLine | undefined,
): Pick<CollapsedGap, 'anchorSide' | 'anchorLine'> | null {
  if (line?.new_line != null) return { anchorSide: 'new', anchorLine: line.new_line }
  if (line?.old_line != null) return { anchorSide: 'old', anchorLine: line.old_line }
  return null
}

/**
 * Начало стороны куска. Если строк этой стороны в куске нет, по правилам unified-диффа это
 * номер последней строки стороны перед куском — с учётом скрытых строк, а не начало hunk.
 */
function startOf(
  source: DiffHunk,
  lines: readonly DiffLine[],
  side: 'old_line' | 'new_line',
  count: number,
): number {
  if (count > 0) return lines.find((line) => line[side] !== null)?.[side] ?? 0
  const before = source.lines.slice(0, source.lines.indexOf(lines[0]))
  const last = [...before].reverse().find((line) => line[side] !== null)?.[side]
  if (last != null) return last
  // Перед куском в hunk строк этой стороны нет: строка перед самим hunk.
  const [start, total] =
    side === 'old_line'
      ? [source.old_start, source.old_count]
      : [source.new_start, source.new_count]
  return Math.max(0, total === 0 ? start : start - 1)
}

function toHunk(source: DiffHunk, lines: DiffLine[], index: number): DiffHunk {
  const oldCount = lines.filter((line) => line.kind !== 'added').length
  const newCount = lines.filter((line) => line.kind !== 'removed').length
  const oldStart = startOf(source, lines, 'old_line', oldCount)
  const newStart = startOf(source, lines, 'new_line', newCount)
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
