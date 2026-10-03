import { describe, expect, it } from 'vitest'

import { ApiError, ContractError } from '../../shared/api'
import { shouldRetry } from './queryClient'

describe('shouldRetry', () => {
  it('ответ вне схемы не повторяется', () => {
    expect(shouldRetry(0, new ContractError('/mock-review', 'нет поля run'))).toBe(false)
  })

  it('4xx не повторяется', () => {
    expect(shouldRetry(0, new ApiError(404, 'нет'))).toBe(false)
  })

  it('5xx и сбой сети повторяются, но не больше двух раз', () => {
    expect(shouldRetry(0, new ApiError(503, 'недоступно'))).toBe(true)
    expect(shouldRetry(1, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetry(2, new TypeError('Failed to fetch'))).toBe(false)
  })
})
