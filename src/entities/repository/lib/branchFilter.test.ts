import { describe, expect, it } from 'vitest'

import {
  branchFilterProblem,
  MAX_BRANCH_PATTERN_LENGTH,
  MAX_BRANCH_PATTERNS,
  normalizeBranchFilter,
} from './branchFilter'

describe('normalizeBranchFilter', () => {
  it('обрезает пробелы по краям паттернов', () => {
    expect(normalizeBranchFilter([' feature/** ', '\tfix/**', 'release/*\n'])).toEqual([
      'feature/**',
      'fix/**',
      'release/*',
    ])
  })

  it('выбрасывает пустые паттерны и паттерны из одних пробелов', () => {
    expect(normalizeBranchFilter(['', '   ', '\t', 'feature/**'])).toEqual(['feature/**'])
    expect(normalizeBranchFilter(['', ' \t '])).toEqual([])
  })

  it('убирает повторы, сохраняя порядок первого вхождения', () => {
    expect(normalizeBranchFilter(['feature/**', 'fix/**', 'feature/**'])).toEqual([
      'feature/**',
      'fix/**',
    ])
  })

  it('повтор после обрезки пробелов — тот же паттерн, а не новый', () => {
    expect(normalizeBranchFilter(['feature/**', ' feature/** '])).toEqual(['feature/**'])
  })

  it('пустой ввод даёт пустой фильтр: ревьюятся все ветки', () => {
    expect(normalizeBranchFilter([])).toEqual([])
  })
})

describe('branchFilterProblem', () => {
  it('нет проблемы у пустого фильтра и обычных паттернов', () => {
    expect(branchFilterProblem([])).toBeNull()
    expect(branchFilterProblem(['feature/**', 'fix/**'])).toBeNull()
  })

  it(`ровно ${MAX_BRANCH_PATTERNS} паттернов — допустимо, граница контракта`, () => {
    const patterns = Array.from({ length: MAX_BRANCH_PATTERNS }, (_, i) => `branch-${i}`)
    expect(branchFilterProblem(patterns)).toBeNull()
  })

  it(`${MAX_BRANCH_PATTERNS + 1}-й паттерн — проблема`, () => {
    const patterns = Array.from({ length: MAX_BRANCH_PATTERNS + 1 }, (_, i) => `branch-${i}`)
    expect(branchFilterProblem(patterns)).toBe('Не больше 50 паттернов')
  })

  it(`паттерн в ровно ${MAX_BRANCH_PATTERN_LENGTH} символов — допустим, граница контракта`, () => {
    expect(branchFilterProblem(['a'.repeat(MAX_BRANCH_PATTERN_LENGTH)])).toBeNull()
  })

  it(`паттерн длиннее ${MAX_BRANCH_PATTERN_LENGTH} символов — проблема`, () => {
    expect(branchFilterProblem(['a'.repeat(MAX_BRANCH_PATTERN_LENGTH + 1)])).toBe(
      'Паттерн — не длиннее 200 символов',
    )
  })

  // Валидация смотрит на черновик формы: пустые и пробельные паттерны не длиннее лимита,
  // поэтому проблемы нет — их выбросит normalizeBranchFilter при сохранении.
  it('пустой паттерн и паттерн из одних пробелов — не проблема: нормализация отбросит их', () => {
    expect(branchFilterProblem([''])).toBeNull()
    expect(branchFilterProblem(['   '])).toBeNull()
  })
})
