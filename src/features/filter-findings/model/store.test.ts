import { beforeEach, describe, expect, it } from 'vitest'

import { makeFinding } from '../../../test/factories'
import { applySeverityFilter, initialFilterFindingsState, useFilterFindings } from './store'

describe('useFilterFindings', () => {
  beforeEach(() => {
    useFilterFindings.setState(initialFilterFindingsState)
  })

  it('повторное нажатие снимает severity с фильтра', () => {
    useFilterFindings.getState().toggleSeverity('high')
    useFilterFindings.getState().toggleSeverity('low')
    useFilterFindings.getState().toggleSeverity('high')

    expect(useFilterFindings.getState().severity_filters).toEqual(['low'])
  })
})

describe('applySeverityFilter', () => {
  const findings = [
    makeFinding({ id: 'c', severity: 'critical' }),
    makeFinding({ id: 'l', severity: 'low' }),
  ]

  it('пустой фильтр показывает все замечания', () => {
    expect(applySeverityFilter(findings, []).map((item) => item.id)).toEqual(['c', 'l'])
  })

  it('оставляет только выбранные severity', () => {
    expect(applySeverityFilter(findings, ['low']).map((item) => item.id)).toEqual(['l'])
  })
})
