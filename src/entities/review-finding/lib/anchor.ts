import { SEVERITIES, type DiffSide, type ReviewFinding } from '../model/schema'

export type FindingsByLine = Record<DiffSide, Map<number, ReviewFinding[]>>

/** Строка, к которой привязано замечание, на его стороне диффа. */
export function anchorLine(finding: ReviewFinding): number | null {
  return finding.side === 'old' ? finding.old_line : finding.new_line
}

export function bySeverity(a: ReviewFinding, b: ReviewFinding): number {
  return SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity)
}

/**
 * Раскладывает замечания по строкам диффа. Замечание без номера строки на своей стороне
 * попадает в `unanchored`: его показывают в сводке, а не приклеивают к случайной строке.
 */
export function groupFindingsByLine(findings: readonly ReviewFinding[]): {
  byLine: FindingsByLine
  unanchored: ReviewFinding[]
} {
  const byLine: FindingsByLine = { old: new Map(), new: new Map() }
  const unanchored: ReviewFinding[] = []

  for (const finding of [...findings].sort(bySeverity)) {
    const line = anchorLine(finding)
    if (line === null) {
      unanchored.push(finding)
      continue
    }
    const bucket = byLine[finding.side]
    bucket.set(line, [...(bucket.get(line) ?? []), finding])
  }

  return { byLine, unanchored }
}
