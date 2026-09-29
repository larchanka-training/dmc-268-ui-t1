import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { parseReview } from './entities/review/model'
import { getMockReview } from './app/mocks/reviewApi'
import { useWorkspaceStore } from './widgets/review-workspace/model/store'

describe('Diff Viewer', () => {
  beforeEach(() =>
    useWorkspaceStore.setState({
      selectedFile: null,
      severities: ['low', 'medium', 'high', 'critical'],
    }),
  )
  it('переключает выбранный файл', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'src/limits.ts' }))
    expect(screen.getByText(/attempts: 5,/)).toBeInTheDocument()
  })
  it('не прикрепляет finding к context-строке и фильтрует findings', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(
      await screen.findByText('Хеширование пароля должно использовать безопасный алгоритм.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Это замечание не должно появиться у context-строки.'),
    ).not.toBeInTheDocument()
    const filter = screen.getByRole('checkbox', { name: 'high' })
    filter.focus()
    await user.keyboard(' ')
    expect(
      screen.queryByText('Хеширование пароля должно использовать безопасный алгоритм.'),
    ).not.toBeInTheDocument()
  })

  it('отвергает некорректные данные adapter', () => {
    expect(() => parseReview({ run: {} })).toThrow()
  })
  it('сохраняет связи mock-сущностей с прогоном и запросом на изменения', async () => {
    const review = await getMockReview()
    expect(review.run.mergeRequestId).toBe('mr-17')
    expect(review.findings.every((finding) => finding.reviewRunId === review.run.id)).toBe(true)
    expect(review.publishedComments.every((comment) => comment.reviewRunId === review.run.id)).toBe(
      true,
    )
    expect(
      review.publishedComments.find((comment) => comment.kind === 'summary')?.findingId,
    ).toBeNull()
  })
  it('показывает детали выбранного действия inspector', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'analyse' }))
    expect(screen.getByText('Найдены два замечания.')).toBeInTheDocument()
  })
})
