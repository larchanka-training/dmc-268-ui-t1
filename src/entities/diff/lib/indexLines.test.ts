import { describe, expect, it } from 'vitest'

import { hunk, makeDiffFile } from '../../../test/factories'
import { indexLines } from './indexLines'

describe('indexLines', () => {
  it('раскладывает строки по сторонам: контекст есть на обеих', () => {
    const file = makeDiffFile({ hunks: [hunk(5, 5, [' keep', '-gone', '+came'])] })

    const index = indexLines(file)

    expect([...index.old]).toEqual([
      [5, 'keep'],
      [6, 'gone'],
    ])
    expect([...index.new]).toEqual([
      [5, 'keep'],
      [6, 'came'],
    ])
  })
})
