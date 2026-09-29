import { beforeEach, describe, expect, it } from 'vitest'

import { initialReviewWorkspaceState, resolveSelectedPath, useReviewWorkspace } from './store'

describe('useReviewWorkspace', () => {
  beforeEach(() => {
    useReviewWorkspace.setState(initialReviewWorkspaceState)
  })

  it('по умолчанию показывает две колонки', () => {
    expect(useReviewWorkspace.getState().viewMode).toBe('split')
  })

  it('режим не сбрасывается при выборе другого файла', () => {
    useReviewWorkspace.getState().setViewMode('unified')
    useReviewWorkspace.getState().selectFile('b.ts')

    expect(useReviewWorkspace.getState()).toMatchObject({
      selectedPath: 'b.ts',
      viewMode: 'unified',
    })
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
