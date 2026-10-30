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

type SuggestionLine = { kind: 'removed' | 'added' | 'context'; text: string }

const LINE_STYLE = {
  removed: { sign: '-', className: 'bg-red-50 text-red-900', label: 'Было: ' },
  added: { sign: '+', className: 'bg-emerald-50 text-emerald-900', label: 'Стало: ' },
  context: { sign: ' ', className: 'text-slate-700', label: '' },
} as const

/**
 * Модель присылает правку унифицированным диффом (`prompts/review/output-format.md`
 * бэкенда), но бывает и просто код замены. Дифф — если каждая непустая строка
 * начинается с `-`, `+` или пробела и есть хоть одна `-`/`+`; иначе текст —
 * замена строки замечания.
 */
function parseSuggestion(suggestion: string, anchorContent?: string): SuggestionLine[] {
  const lines = suggestion.split('\n')
  const isDiff =
    lines.some((line) => /^[-+]/.test(line)) &&
    lines.every((line) => line === '' || /^[-+ ]/.test(line))
  if (isDiff) {
    return lines
      .filter((line) => line !== '')
      .map((line) => ({
        kind: line[0] === '-' ? 'removed' : line[0] === '+' ? 'added' : 'context',
        text: line.slice(1),
      }))
  }
  return [
    ...(anchorContent !== undefined ? [{ kind: 'removed' as const, text: anchorContent }] : []),
    ...lines.map((text) => ({ kind: 'added' as const, text })),
  ]
}

function SuggestionBlock({
  suggestion,
  anchorContent,
}: {
  suggestion: string
  anchorContent?: string
}) {
  const captionId = useId()
  const lines = parseSuggestion(suggestion, anchorContent)
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
        {lines.map((line, index) => {
          const style = LINE_STYLE[line.kind]
          // Подпись для скринридера — у первой строки каждой стороны.
          const first = lines.findIndex((other) => other.kind === line.kind) === index
          return (
            <code key={index} className={`block px-3 ${style.className}`}>
              <span aria-hidden className="select-none pr-2">
                {style.sign}
              </span>
              {first && style.label && <span className="sr-only">{style.label}</span>}
              {line.text}
            </code>
          )
        })}
      </pre>
    </figure>
  )
}
