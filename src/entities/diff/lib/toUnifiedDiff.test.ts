import { describe, expect, it } from 'vitest'

import { makeDiffFile, hunk } from '../../../test/factories'
import { toUnifiedDiff } from './toUnifiedDiff'

describe('toUnifiedDiff', () => {
  it('собирает заголовок файла и hunk с префиксами строк', () => {
    const file = makeDiffFile({
      path: 'src/retry.ts',
      hunks: [
        hunk(
          10,
          10,
          [' const a = 1', '-const b = 2', '+const b = 3', '+const c = 4'],
          'function run()',
        ),
      ],
    })

    expect(toUnifiedDiff(file)).toBe(
      [
        '--- a/src/retry.ts',
        '+++ b/src/retry.ts',
        '@@ -10,2 +10,3 @@ function run()',
        ' const a = 1',
        '-const b = 2',
        '+const b = 3',
        '+const c = 4',
        '',
      ].join('\n'),
    )
  })

  it('для нового файла старая сторона — /dev/null', () => {
    const file = makeDiffFile({ path: 'a.ts', status: 'added', hunks: [hunk(0, 1, ['+x'])] })
    expect(toUnifiedDiff(file)).toMatch(/^--- \/dev\/null\n\+\+\+ b\/a\.ts\n/)
  })

  it('для удалённого файла новая сторона — /dev/null', () => {
    const file = makeDiffFile({ path: 'a.ts', status: 'deleted', hunks: [hunk(1, 0, ['-x'])] })
    expect(toUnifiedDiff(file)).toMatch(/^--- a\/a\.ts\n\+\+\+ \/dev\/null\n/)
  })

  it('для переименования старая сторона берётся из previous_path', () => {
    const file = makeDiffFile({
      path: 'new.ts',
      previous_path: 'old.ts',
      status: 'renamed',
      hunks: [hunk(1, 1, [' x'])],
    })
    expect(toUnifiedDiff(file)).toMatch(/^--- a\/old\.ts\n\+\+\+ b\/new\.ts\n/)
  })
})
