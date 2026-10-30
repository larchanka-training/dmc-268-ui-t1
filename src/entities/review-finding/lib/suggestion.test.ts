import { describe, expect, it } from 'vitest'

import { parseSuggestion } from './suggestion'

const removed = (text: string) => ({ kind: 'removed', text })
const added = (text: string) => ({ kind: 'added', text })
const context = (text: string) => ({ kind: 'context', text })

describe('parseSuggestion', () => {
  it.each([
    ['дифф', '-a\n+b\n c', [removed('a'), added('b'), context('c')]],
    ['чередование сторон', '-a\n+b\n-c\n+d', [removed('a'), added('b'), removed('c'), added('d')]],
    ['заголовки и @@', '--- a/f.py\n+++ b/f.py\n@@ -1 +1 @@\n-a\n+b', [removed('a'), added('b')]],
    ['удалённый SQL-комментарий', '--- x\n+y', [removed('-- x'), added('y')]],
    [
      'пустая строка внутри и хвостовой перевод строки',
      '-a\n\n+b\n',
      [removed('a'), context(''), added('b')],
    ],
    ['CRLF', '-a\r\n+b', [removed('a'), added('b')]],
    ['только вставка', '+a', [added('a')]],
  ])('%s', (_name, suggestion, expected) => {
    expect(parseSuggestion(suggestion, 'строка замечания')).toEqual(expected)
  })

  it('код замены — «Стало» после строки замечания', () => {
    expect(parseSuggestion('    x = 1\n    y = 2', 'x = 0')).toEqual([
      removed('x = 0'),
      added('    x = 1'),
      added('    y = 2'),
    ])
  })
})
