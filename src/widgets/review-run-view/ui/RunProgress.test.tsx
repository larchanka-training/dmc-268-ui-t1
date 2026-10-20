import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ReviewRun, RunStage } from '../../../entities/review-run'
import { AppProviders } from '../../../app/providers/AppProviders'
import { fakeTransport } from '../../../test/api'
import { createFakeEventStream } from '../../../test/fakeEventStream'
import { makeReviewRun } from '../../../test/factories'
import { RunProgress, STALE_AFTER } from './RunProgress'

type Steps = [string, string, string]

/** Состояние шагов читаем так, как его услышит скринридер: подпись шага и его статус. */
function stepStates(): Steps {
  return ['Сбор контекста', 'Анализ LLM', 'Публикация'].map((title) =>
    (screen.getByText(title).textContent ?? '').replace(`${title}: `, ''),
  ) as Steps
}

/** Визуальный статус шагов antd: его слышит не скринридер, а глаз, поэтому читаем класс шага. */
function stepClasses(): Steps {
  return ['Сбор контекста', 'Анализ LLM', 'Публикация'].map((title) => {
    const item = screen.getByText(title).closest('.ant-steps-item')
    return /ant-steps-item-(wait|process|finish|error)\b/.exec(item?.className ?? '')?.[1] ?? ''
  }) as Steps
}

function renderProgress(run: Partial<ReviewRun>, seenStage: RunStage | null = null) {
  return render(<RunProgress run={makeReviewRun(run)} seenStage={seenStage} />)
}

describe('RunProgress', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('очередь: ни один шаг не начат, подпись «В очереди»', () => {
    renderProgress({ status: 'queued' })

    expect(stepStates()).toEqual(['ожидает', 'ожидает', 'ожидает'])
    expect(screen.getByText('В очереди')).toBeInTheDocument()
  })

  it('сбор контекста: первый шаг выполняется', () => {
    renderProgress({ status: 'building_context' })

    expect(stepStates()).toEqual(['выполняется', 'ожидает', 'ожидает'])
  })

  it('анализ: контекст собран, анализ идёт, публикация ждёт', () => {
    renderProgress({ status: 'analysing' })

    expect(stepStates()).toEqual(['завершён', 'выполняется', 'ожидает'])
  })

  it('публикация: два шага позади, третий выполняется', () => {
    renderProgress({ status: 'publishing' })

    expect(stepStates()).toEqual(['завершён', 'завершён', 'выполняется'])
  })

  it('прогон завершён: все шаги завершены', () => {
    renderProgress({ status: 'completed' })

    expect(stepStates()).toEqual(['завершён', 'завершён', 'завершён'])
  })

  it('сбой на известном этапе: ошибка на нём, причина рядом', () => {
    renderProgress({
      status: 'failed',
      failed_stage: 'analysing',
      failure_reason: 'LLM не ответила',
    })

    expect(stepStates()).toEqual(['завершён', 'ошибка', 'ожидает'])
    expect(screen.getByText('LLM не ответила')).toBeInTheDocument()
  })

  it('сбой без failed_stage берёт последний виденный этап', () => {
    renderProgress({ status: 'failed', failure_reason: 'сбой' }, 'publishing')

    expect(stepStates()).toEqual(['завершён', 'завершён', 'ошибка'])
  })

  it('этап сбоя неизвестен: ни один шаг не отмечен ошибкой, подпись это говорит', () => {
    renderProgress({ status: 'failed' })

    expect(stepStates()).toEqual(['ожидает', 'ожидает', 'ожидает'])
    expect(screen.getByText('Этап сбоя неизвестен')).toBeInTheDocument()
  })

  it('отмена из анализа: контекст завершён, остальное не начато', () => {
    renderProgress({ status: 'cancelled' }, 'analysing')

    expect(stepStates()).toEqual(['завершён', 'ожидает', 'ожидает'])
    expect(screen.getByText('Отменён')).toBeInTheDocument()
  })

  it('отмена на неизвестном этапе: шаги не начаты', () => {
    renderProgress({ status: 'cancelled' })

    expect(stepStates()).toEqual(['ожидает', 'ожидает', 'ожидает'])
    expect(screen.getByText('Отменён')).toBeInTheDocument()
  })

  it('незнакомый статус шаги не двигает', () => {
    renderProgress({ status: 'waiting_for_quota' })

    expect(stepStates()).toEqual(['ожидает', 'ожидает', 'ожидает'])
  })

  it.each<[string, Partial<ReviewRun>, RunStage | null, Steps]>([
    ['очередь', { status: 'queued' }, null, ['wait', 'wait', 'wait']],
    ['анализ', { status: 'analysing' }, null, ['finish', 'process', 'wait']],
    ['публикация', { status: 'publishing' }, null, ['finish', 'finish', 'process']],
    ['завершён', { status: 'completed' }, null, ['finish', 'finish', 'finish']],
    [
      'сбой на анализе',
      { status: 'failed', failed_stage: 'analysing' },
      null,
      ['finish', 'error', 'wait'],
    ],
    ['отмена из публикации', { status: 'cancelled' }, 'publishing', ['finish', 'finish', 'wait']],
  ])('визуальный статус шагов: %s', (_name, run, seen, expected) => {
    renderProgress(run, seen)

    expect(stepClasses()).toEqual(expected)
  })

  it('смена этапа объявляется скринридеру', () => {
    renderProgress({ status: 'analysing' })

    expect(screen.getByText('Анализ LLM').closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite',
    )
  })

  describe('зависший прогон', () => {
    const progressAt = '2026-10-11T10:00:00Z'

    function renderAt(now: number, run: Partial<ReviewRun>) {
      vi.useFakeTimers()
      vi.setSystemTime(now)
      return renderProgress({ status: 'analysing', last_progress_at: progressAt, ...run })
    }

    it('прогон не продвигается дольше порога: предупреждение', () => {
      renderAt(Date.parse(progressAt) + STALE_AFTER + 1, {})

      expect(screen.getByRole('alert')).toHaveTextContent('Прогон давно не продвигался')
    })

    it('в пределах порога предупреждения нет', () => {
      renderAt(Date.parse(progressAt) + STALE_AFTER - 1, {})

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('предупреждение появляется само, когда время вышло, без запросов', () => {
      const get = vi.fn()
      const stream = createFakeEventStream()
      vi.useFakeTimers()
      vi.setSystemTime(Date.parse(progressAt) + 60_000)
      render(
        <AppProviders transport={fakeTransport({ get })} eventStream={stream}>
          <RunProgress
            run={makeReviewRun({ status: 'analysing', last_progress_at: progressAt })}
            seenStage={null}
          />
        </AppProviders>,
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(STALE_AFTER)
      })

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(get).not.toHaveBeenCalled()
      expect(stream.opened).toEqual([])
    })

    it('свежий last_progress_at скрывает предупреждение', () => {
      const now = Date.parse(progressAt) + STALE_AFTER + 1
      const { rerender } = renderAt(now, {})
      expect(screen.getByRole('alert')).toBeInTheDocument()

      rerender(
        <RunProgress
          run={makeReviewRun({
            status: 'publishing',
            last_progress_at: new Date(now).toISOString(),
          })}
          seenStage="analysing"
        />,
      )

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('свежий last_progress_at при том же статусе скрывает предупреждение', () => {
      const now = Date.parse(progressAt) + STALE_AFTER + 1
      const { rerender } = renderAt(now, {})
      expect(screen.getByRole('alert')).toBeInTheDocument()

      rerender(
        <RunProgress
          run={makeReviewRun({
            status: 'analysing',
            last_progress_at: new Date(now).toISOString(),
          })}
          seenStage="analysing"
        />,
      )

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('у завершённого прогона предупреждения нет', () => {
      renderAt(Date.parse(progressAt) + STALE_AFTER * 5, { status: 'completed' })

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
