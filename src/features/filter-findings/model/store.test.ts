import { beforeEach, describe, expect, it } from 'vitest'

import { makeFinding } from '../../../test/factories'
import {
  applyFileFilters,
  applyFindingFilters,
  applySeverityFilter,
  applyTextFilter,
  hasActiveFilters,
  initialFilterFindingsState,
  useFilterFindings,
} from './store'

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

  it('resetFilters сбрасывает фильтры всех видов одним действием', () => {
    const state = useFilterFindings.getState()
    state.toggleSeverity('high')
    state.setFileQuery('api/')
    state.setOnlyWithFindings(true)
    state.setTextQuery('sql')

    useFilterFindings.getState().resetFilters()

    expect(useFilterFindings.getState()).toMatchObject({
      ...initialFilterFindingsState,
      reset_count: 1,
    })
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

describe('applyTextFilter', () => {
  const findings = [
    makeFinding({ id: 'sql', message: 'Возможна SQL-инъекция', suggestion: null }),
    makeFinding({
      id: 'code',
      message: 'Секрет в коде',
      suggestion: 'token = os.environ["TOKEN"]',
    }),
    makeFinding({ id: 'other', message: 'Нет тестов', suggestion: null }),
  ]
  const ids = (query: string) => applyTextFilter(findings, query).map((item) => item.id)

  it('ищет по тексту замечания без учёта регистра', () => {
    expect(ids('sql')).toEqual(['sql'])
  })

  it('запрос в верхнем регистре находит замечание в нижнем и наоборот', () => {
    expect(ids('SQL')).toEqual(['sql'])
    expect(ids('ВОЗМОЖНА')).toEqual(['sql'])
    expect(ids('ENVIRON')).toEqual(['code'])
  })

  it('ищет и в предлагаемом коде', () => {
    expect(ids('environ')).toEqual(['code'])
  })

  it('пустая строка и пробелы показывают все замечания', () => {
    expect(ids('')).toEqual(['sql', 'code', 'other'])
    expect(ids('   ')).toEqual(['sql', 'code', 'other'])
  })

  it('края строки обрезаются', () => {
    expect(ids('  инъекция ')).toEqual(['sql'])
  })
})

describe('applyFindingFilters', () => {
  const findings = [
    makeFinding({ id: 'a', severity: 'critical', message: 'Токен в логе' }),
    makeFinding({ id: 'b', severity: 'high', message: 'Токен без срока жизни' }),
    makeFinding({ id: 'c', severity: 'low', message: 'Токен в README' }),
    makeFinding({ id: 'd', severity: 'high', message: 'Нет тестов' }),
  ]

  it('severity объединяются через «или», с текстом — через «и»', () => {
    const result = applyFindingFilters(findings, {
      severity_filters: ['high', 'critical'],
      text_query: 'токен',
    })

    expect(result.map((item) => item.id)).toEqual(['a', 'b'])
  })
})

describe('applyFileFilters', () => {
  const files = [
    { path: 'src/api/Client.ts' },
    { path: 'src/ui/Button.tsx' },
    { path: 'docs/API/readme.md' },
  ]
  const findings = [makeFinding({ file_path: 'src/ui/Button.tsx' })]
  const off = { file_query: '', only_with_findings: false }
  const paths = (filters: typeof off) =>
    applyFileFilters(files, findings, filters).map((file) => file.path)

  it('без фильтров список не меняется', () => {
    expect(paths(off)).toHaveLength(3)
  })

  it('оставляет файлы с подстрокой в пути без учёта регистра', () => {
    expect(paths({ ...off, file_query: 'api/' })).toEqual([
      'src/api/Client.ts',
      'docs/API/readme.md',
    ])
  })

  it('запрос по пути в верхнем регистре находит файлы без учёта регистра', () => {
    expect(paths({ ...off, file_query: 'API/' })).toEqual([
      'src/api/Client.ts',
      'docs/API/readme.md',
    ])
    expect(paths({ ...off, file_query: 'BUTTON' })).toEqual(['src/ui/Button.tsx'])
  })

  it('«только с замечаниями» смотрит на замечания под фильтры замечаний', () => {
    expect(paths({ ...off, only_with_findings: true })).toEqual(['src/ui/Button.tsx'])
    expect(applyFileFilters(files, [], { ...off, only_with_findings: true })).toEqual([])
  })

  it('фильтры файлов сочетаются через «и»', () => {
    expect(paths({ file_query: 'api/', only_with_findings: true })).toEqual([])
  })
})

describe('hasActiveFilters', () => {
  const off = {
    severity_filters: [],
    file_query: '  ',
    only_with_findings: false,
    text_query: '',
  }

  it('пробелы вместо запроса — не фильтр', () => {
    expect(hasActiveFilters(off)).toBe(false)
  })

  it.each([
    { severity_filters: ['low' as const] },
    { file_query: 'a' },
    { only_with_findings: true },
    { text_query: 'a' },
  ])('любой включённый фильтр делает их активными: %o', (patch) => {
    expect(hasActiveFilters({ ...off, ...patch })).toBe(true)
  })
})
