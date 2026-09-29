import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { makeFinding, makePublishedComment } from '../../../test/factories'
import { ReviewCommentThread } from './ReviewCommentThread'

const finding = makeFinding({
  severity: 'critical',
  category: 'security',
  message: 'SQL собирается конкатенацией.\nПараметр run_id приходит из запроса.',
  suggestion: 'query = text("SELECT * FROM runs WHERE id = :id")',
})

describe('ReviewCommentThread', () => {
  it('показывает severity, категорию и первую строку замечания', () => {
    render(<ReviewCommentThread finding={finding} />)

    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Безопасность')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /SQL собирается конкатенацией/ })).toBeInTheDocument()
  })

  it('серьёзное замечание раскрыто сразу и сворачивается по клику', async () => {
    const user = userEvent.setup()
    render(<ReviewCommentThread finding={finding} />)
    const toggle = screen.getByRole('button', { name: /SQL собирается/ })

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Параметр run_id приходит из запроса/)).toBeVisible()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/Параметр run_id приходит из запроса/)).not.toBeInTheDocument()
  })

  it('незначительное замечание свёрнуто, пока его не раскроют', async () => {
    const user = userEvent.setup()
    render(
      <ReviewCommentThread finding={makeFinding({ severity: 'low', message: 'Длинное имя.' })} />,
    )
    const toggle = screen.getByRole('button', { name: /Длинное имя/ })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('показывает исходную строку и предлагаемую замену', () => {
    render(<ReviewCommentThread finding={finding} anchorContent={'query = f"SELECT {run_id}"'} />)

    const block = screen.getByRole('figure', { name: 'Предлагаемое исправление' })
    expect(block).toHaveTextContent('Было: query = f"SELECT {run_id}"')
    expect(block).toHaveTextContent('Стало: query = text("SELECT * FROM runs WHERE id = :id")')
  })

  it('без предложения блока исправления нет', () => {
    render(<ReviewCommentThread finding={makeFinding({ severity: 'high', suggestion: null })} />)

    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })

  it('сообщает, опубликовано ли замечание у провайдера', () => {
    const { rerender } = render(<ReviewCommentThread finding={finding} />)
    expect(screen.getByText('Не опубликовано у провайдера')).toBeInTheDocument()

    rerender(<ReviewCommentThread finding={finding} publication={makePublishedComment()} />)
    expect(screen.getByText(/^Опубликовано 20\.09\.2026/)).toBeInTheDocument()
  })
})
