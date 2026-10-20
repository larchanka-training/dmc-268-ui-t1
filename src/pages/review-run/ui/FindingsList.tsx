import { publicationsByFinding, type PublishedComment } from '../../../entities/published-comment'
import {
  anchorLine,
  bySeverity,
  ReviewCommentThread,
  type ReviewFinding,
} from '../../../entities/review-finding'
import { EmptyState } from '../../../shared/ui'

type Props = {
  findings: readonly ReviewFinding[]
  publishedComments: readonly PublishedComment[]
}

/**
 * Замечания без диффа: бэкенд дифф прогона пока не отдаёт (решение 2 в dmc-268-ui-t1#37),
 * поэтому каждое замечание показывается с путём и строкой, самые серьёзные — первыми.
 */
export function FindingsList({ findings, publishedComments }: Props) {
  if (findings.length === 0) return <EmptyState>Замечаний нет.</EmptyState>
  const publications = publicationsByFinding(publishedComments)
  return (
    <section aria-label="Замечания" className="space-y-3">
      {[...findings].sort(bySeverity).map((finding) => (
        <div key={finding.id} className="space-y-1">
          <p className="font-mono text-xs text-slate-500">
            {finding.file_path}:{anchorLine(finding) ?? '—'}
          </p>
          <ReviewCommentThread finding={finding} publication={publications.get(finding.id)} />
        </div>
      ))}
    </section>
  )
}
