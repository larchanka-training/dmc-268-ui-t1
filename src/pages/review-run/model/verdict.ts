import type { ReviewFinding } from '../../../entities/review-finding'
import type { Verdict } from '../../../entities/review-run'

/** Замечания, с которыми мёржить нельзя. */
const BLOCKING: ReadonlySet<ReviewFinding['severity']> = new Set(['critical', 'high'])

/**
 * Итог ревью по замечаниям завершённого прогона (решение 1 в dmc-268-ui-t1#37): блокирующие —
 * «нужны правки», остальные — «есть замечания», ни одного — «можно мёржить». У незавершённого
 * или упавшего прогона список замечаний неполный, и вердикта нет.
 */
export function runVerdict(status: string, findings: readonly ReviewFinding[]): Verdict | null {
  if (status !== 'completed') return null
  if (findings.some((finding) => BLOCKING.has(finding.severity))) return 'request_changes'
  return findings.length > 0 ? 'comment' : 'approve'
}
