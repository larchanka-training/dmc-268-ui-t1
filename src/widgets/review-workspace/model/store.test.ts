import { beforeEach, describe, expect, it } from 'vitest'

import { initialReviewWorkspaceState, resolveSelectedPath, useReviewWorkspace } from './store'

describe('useReviewWorkspace', () => {
  beforeEach(() => {
    useReviewWorkspace.setState(initialReviewWorkspaceState)
  })

  it('по умолчанию показывает две колонки', () => {
    expect(useReviewWorkspace.getState().view_mode).toBe('side_by_side')
  })

  it('режим не сбрасывается при выборе другого файла', () => {
    useReviewWorkspace.getState().setViewMode('unified')
    useReviewWorkspace.getState().selectFile('b.ts')

    expect(useReviewWorkspace.getState()).toMatchObject({
      selected_file: 'b.ts',
      view_mode: 'unified',
    })
  })

  it('повторное раскрытие не дублирует строки', () => {
    useReviewWorkspace.getState().expandContext(['a', 'b'])
    useReviewWorkspace.getState().expandContext(['b', 'c'])

    expect(useReviewWorkspace.getState().expanded_context_line_ids).toEqual(['a', 'b', 'c'])
  })
})

describe('resolveSelectedPath', () => {
  it('без выбора берёт первый файл', () => {
    expect(resolveSelectedPath(null, ['a.ts', 'b.ts'])).toBe('a.ts')
  })

  it('оставляет выбранный файл, если он есть в прогоне', () => {
    expect(resolveSelectedPath('b.ts', ['a.ts', 'b.ts'])).toBe('b.ts')
  })

  it('выбор из другого прогона заменяется первым файлом', () => {
    expect(resolveSelectedPath('gone.ts', ['a.ts'])).toBe('a.ts')
  })

  it('в пустом прогоне выбирать нечего', () => {
    expect(resolveSelectedPath('a.ts', [])).toBeNull()
  })
})
