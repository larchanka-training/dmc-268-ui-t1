import type { DiffFile } from '../model/schema'

export type LineIndex = Record<'old' | 'new', Map<number, string>>

/** Содержимое строк диффа по номеру на каждой стороне: какие строки вообще показаны. */
export function indexLines(file: DiffFile): LineIndex {
  const index: LineIndex = { old: new Map(), new: new Map() }
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.old_line !== null) index.old.set(line.old_line, line.content)
      if (line.new_line !== null) index.new.set(line.new_line, line.content)
    }
  }
  return index
}
