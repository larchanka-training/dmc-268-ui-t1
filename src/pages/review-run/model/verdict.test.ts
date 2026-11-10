import { describe, expect, it } from 'vitest'

import { makeFinding } from '../../../test/factories'
import { runVerdict } from './verdict'

const run = (status: string, coverage_reason: string | null = null) => ({ status, coverage_reason })

describe('runVerdict', () => {
  it.each([
    ['critical', 'request_changes'],
    ['high', 'request_changes'],
    ['medium', 'comment'],
    ['low', 'comment'],
  ] as const)('замечание %s — %s', (severity, verdict) => {
    expect(runVerdict(run('completed'), [makeFinding({ severity })])).toBe(verdict)
  })

  it('без замечаний — можно мёржить', () => {
    expect(runVerdict(run('completed'), [])).toBe('approve')
  })

  it.each(['analysing', 'failed', 'cancelled'])('прогон %s — вердикта нет', (status) => {
    expect(runVerdict(run(status), [makeFinding({ severity: 'critical' })])).toBeNull()
  })

  it('отказ по балансу — вердикта нет, хотя прогон completed и замечаний нет', () => {
    expect(runVerdict(run('completed', 'balance'), [])).toBeNull()
  })
})
