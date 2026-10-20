import { describe, expect, it } from 'vitest'

import { makeFinding } from '../../../test/factories'
import { runVerdict } from './verdict'

describe('runVerdict', () => {
  it.each([
    ['critical', 'request_changes'],
    ['high', 'request_changes'],
    ['medium', 'comment'],
    ['low', 'comment'],
  ] as const)('замечание %s — %s', (severity, verdict) => {
    expect(runVerdict('completed', [makeFinding({ severity })])).toBe(verdict)
  })

  it('без замечаний — можно мёржить', () => {
    expect(runVerdict('completed', [])).toBe('approve')
  })

  it.each(['analysing', 'failed', 'cancelled'])('прогон %s — вердикта нет', (status) => {
    expect(runVerdict(status, [makeFinding({ severity: 'critical' })])).toBeNull()
  })
})
