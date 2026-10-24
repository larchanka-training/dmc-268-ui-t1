import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RefreshErrorNotice } from './RefreshErrorNotice'

describe('RefreshErrorNotice', () => {
  it('говорит, что на экране прежние данные, и «Повторить» перезапрашивает', async () => {
    const onRetry = vi.fn()
    render(<RefreshErrorNotice title="Не удалось обновить прогон" onRetry={onRetry} />)

    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent('Не удалось обновить прогон')
    expect(notice).toHaveTextContent('последние полученные данные')
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })
})
