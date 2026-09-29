import { describe, expect, it } from 'vitest'

import { hunk, makeDiffFile } from '../../../test/factories'
import { collapseContext } from './collapseContext'
import { toUnifiedDiff } from './toUnifiedDiff'

const file = makeDiffFile({
  path: 'a.py',
  hunks: [
    hunk(10, 10, [
      ' def a():',
      '-    old()',
      '+    new()',
      '~    one()',
      '~    two()',
      ' def b():',
      '+    x()',
    ]),
    hunk(40, 41, ['~    far()', ' def c():', '+    y()']),
  ],
})

describe('collapseContext', () => {
  it('скрывает свёрнутый блок и делит hunk так, что номера строк остаются верными', () => {
    const { file: shown } = collapseContext(file, new Set())

    expect(shown.hunks.map((item) => item.header)).toEqual([
      '@@ -10,2 +10,2 @@',
      '@@ -14,1 +14,2 @@',
      '@@ -41,1 +42,2 @@',
    ])
    expect(toUnifiedDiff(shown)).not.toContain('one()')
  })

  it('кнопка раскрытия стоит под последней видимой строкой перед блоком', () => {
    const { gaps } = collapseContext(file, new Set())

    expect(gaps[0]).toMatchObject({ hunkId: 'a.py#0', anchorLine: 11, position: 'after' })
    expect(gaps[0].lineIds).toEqual(['a.py#0:3', 'a.py#0:4'])
  })

  it('блок в начале hunk раскрывается от первой строки после него', () => {
    const { gaps } = collapseContext(file, new Set())

    expect(gaps[1]).toMatchObject({ hunkId: 'a.py#1', anchorLine: 42, position: 'before' })
  })

  it('раскрытие одного блока не раскрывает другой hunk', () => {
    const { file: shown, gaps } = collapseContext(file, new Set(['a.py#0:3', 'a.py#0:4']))

    const text = toUnifiedDiff(shown)
    expect(text).toContain('    one()')
    expect(text).not.toContain('    far()')
    expect(gaps.map((gap) => gap.hunkId)).toEqual(['a.py#1'])
  })

  it('hunk из одного свёрнутого блока показывается целиком', () => {
    const only = makeDiffFile({ path: 'b.py', hunks: [hunk(1, 1, ['~x', '~y'])] })

    const { file: shown, gaps } = collapseContext(only, new Set())

    expect(shown.hunks[0].lines).toHaveLength(2)
    expect(gaps).toEqual([])
  })
})
