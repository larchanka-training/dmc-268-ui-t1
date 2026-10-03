import { Collapse } from 'antd'
import { useId } from 'react'

import { formatDateTime, stripCodeMarks } from '../../../shared/lib'
import { TextWithCode } from '../../../shared/ui'
import type { ReviewFinding } from '../model/schema'
import { CATEGORY_LABEL } from '../model/labels'
import { SeverityBadge } from './SeverityBadge'

/** Достаточно даты публикации: сущность `PublishedComment` живёт в соседнем слайсе. */
type Publication = { published_at: string }

type Props = {
  finding: ReviewFinding
  publication?: Publication
  /** Текст строки, к которой привязано замечание: из него строится блок предлагаемого кода. */
  anchorContent?: string
  defaultOpen?: boolean
}

/** Замечание AI у строки диффа: severity, текст, предлагаемый код и статус публикации. */
export function ReviewCommentThread({ finding, publication, anchorContent, defaultOpen }: Props) {
  const open = defaultOpen ?? (finding.severity === 'critical' || finding.severity === 'high')
  const [headline] = finding.message.split('\n')

  return (
    <article
      aria-label={`Замечание: ${stripCodeMarks(headline)}`}
      className="overflow-hidden rounded-lg border border-slate-200 bg-white text-sm shadow-sm"
    >
      <Collapse
        ghost
        destroyOnHidden
        defaultActiveKey={open ? ['finding'] : []}
        items={[
          {
            key: 'finding',
            label: (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <SeverityBadge severity={finding.severity} />
                <span className="text-xs text-slate-500">{CATEGORY_LABEL[finding.category]}</span>
                <span className="min-w-0 flex-1 basis-40 truncate font-medium text-slate-900">
                  <TextWithCode text={headline} />
                </span>
              </span>
            ),
            children: (
              <div className="space-y-3">
                <p className="whitespace-pre-line text-slate-800">
                  <TextWithCode text={finding.message} />
                </p>

                {finding.suggestion !== null && (
                  <SuggestionBlock suggestion={finding.suggestion} anchorContent={anchorContent} />
                )}

                <footer className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>
                    {publication
                      ? `Опубликовано ${formatDateTime(publication.published_at)}`
                      : 'Не опубликовано у провайдера'}
                  </span>
                  {finding.confidence !== null && (
                    <span>Уверенность {Math.round(finding.confidence * 100)}%</span>
                  )}
                </footer>
              </div>
            ),
          },
        ]}
      />
    </article>
  )
}

function SuggestionBlock({
  suggestion,
  anchorContent,
}: {
  suggestion: string
  anchorContent?: string
}) {
  const captionId = useId()
  return (
    <figure
      aria-labelledby={captionId}
      className="overflow-hidden rounded-md border border-slate-200"
    >
      <figcaption
        id={captionId}
        className="bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
      >
        Предлагаемое исправление
      </figcaption>
      <pre className="font-mono text-xs leading-5 whitespace-pre-wrap break-all">
        {anchorContent !== undefined && (
          <code className="block bg-red-50 px-3 text-red-900">
            <span aria-hidden className="select-none pr-2">
              -
            </span>
            <span className="sr-only">Было: </span>
            {anchorContent}
          </code>
        )}
        {suggestion.split('\n').map((line, index) => (
          <code key={index} className="block bg-emerald-50 px-3 text-emerald-900">
            <span aria-hidden className="select-none pr-2">
              +
            </span>
            {index === 0 && <span className="sr-only">Стало: </span>}
            {line}
          </code>
        ))}
      </pre>
    </figure>
  )
}
