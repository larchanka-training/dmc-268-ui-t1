import type { ApiDiffFile, DiffFile, DiffHunk, DiffLine } from '../model/schema'
import { withLineIds } from './build'

/**
 * Сколько строк контекста вокруг изменения видно сразу — как в unified diff по умолчанию.
 * GitHub отдаёт ровно столько, поэтому его дифф не сворачивается; дальний контекст (уровень
 * ±30 строк) скрывается до раскрытия.
 */
export const VISIBLE_CONTEXT = 3

/** UI-модель файла из ответа контракта: идентификаторы строк и свёрнутый дальний контекст. */
export function toDiffFile(file: ApiDiffFile): DiffFile {
  return withLineIds({
    path: file.path,
    previous_path: file.previous_path,
    status: file.status,
    is_binary: file.is_binary,
    language: file.language,
    hunks: file.hunks.map((hunk): DiffHunk => ({
      ...hunk,
      id: '',
      lines: markFarContext(hunk.lines),
    })),
  })
}

function markFarContext(lines: ApiDiffFile['hunks'][number]['lines']): DiffLine[] {
  const changed = lines.flatMap((line, i) => (line.kind === 'context' ? [] : [i]))
  return lines.map((line, i) => ({
    ...line,
    id: '',
    is_collapsed_context:
      line.kind === 'context' && changed.every((c) => Math.abs(c - i) > VISIBLE_CONTEXT),
  }))
}
