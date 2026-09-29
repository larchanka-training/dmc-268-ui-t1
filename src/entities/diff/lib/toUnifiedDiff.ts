import type { DiffFile, DiffLine } from '../model/schema'

const PREFIX: Record<DiffLine['kind'], string> = {
  added: '+',
  removed: '-',
  context: ' ',
}

/**
 * Собирает текст unified-диффа из структурного `DiffFile`: в таком виде его принимает
 * просмотрщик. Номера строк берутся из заголовков hunk'ов, поэтому строки внутри hunk
 * должны идти в порядке контракта.
 */
export function toUnifiedDiff(file: DiffFile): string {
  const oldPath = file.status === 'added' ? '/dev/null' : `a/${file.previous_path ?? file.path}`
  const newPath = file.status === 'deleted' ? '/dev/null' : `b/${file.path}`

  const hunks = file.hunks.flatMap((hunk) => [
    `@@ -${hunk.old_start},${hunk.old_count} +${hunk.new_start},${hunk.new_count} @@${hunkContext(hunk.header)}`,
    ...hunk.lines.map((line) => PREFIX[line.kind] + line.content),
  ])

  return [`--- ${oldPath}`, `+++ ${newPath}`, ...hunks].join('\n') + '\n'
}

/** Хвост заголовка после `@@ … @@` — обычно имя функции, в которой изменение. */
function hunkContext(header: string): string {
  const match = header.match(/^@@[^@]*@@(.*)$/)
  return match ? match[1] : ''
}
