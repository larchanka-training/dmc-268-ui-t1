import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RunStatusBadge } from './RunStatusBadge'

/** Все семь статусов прогона из домена backend: каждый читается текстом, не только цветом. */
const LABELS: [string, string][] = [
  ['queued', 'В очереди'],
  ['building_context', 'Сбор контекста'],
  ['analysing', 'Анализ'],
  ['publishing', 'Публикация'],
  ['completed', 'Завершён'],
  ['failed', 'Ошибка'],
  ['cancelled', 'Отменён'],
]

describe('RunStatusBadge', () => {
  it.each(LABELS)('статус %s показан как «%s»', (status, label) => {
    render(<RunStatusBadge status={status} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('незнакомый статус показывается как есть и не роняет бейдж', () => {
    render(<RunStatusBadge status="rebasing" />)

    expect(screen.getByText('rebasing')).toBeInTheDocument()
  })
})
