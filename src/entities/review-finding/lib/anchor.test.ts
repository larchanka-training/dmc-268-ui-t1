import { describe, expect, it } from 'vitest'

import { makeFinding } from '../../../test/factories'
import { groupFindingsByLine } from './anchor'

describe('groupFindingsByLine', () => {
  it('кладёт замечание на строку его стороны диффа', () => {
    const onNew = makeFinding({ id: 'n', side: 'new', new_line: 12, old_line: 10 })
    const onOld = makeFinding({ id: 'o', side: 'old', old_line: 7, new_line: null })

    const { byLine, unanchored } = groupFindingsByLine([onNew, onOld])

    expect(byLine.new.get(12)).toEqual([onNew])
    expect(byLine.old.get(7)).toEqual([onOld])
    expect(byLine.new.has(10)).toBe(false)
    expect(unanchored).toEqual([])
  })

  it('замечание без строки на своей стороне не привязывается', () => {
    const lost = makeFinding({ side: 'new', new_line: null, old_line: 5 })

    const { byLine, unanchored } = groupFindingsByLine([lost])

    expect(byLine.new.size + byLine.old.size).toBe(0)
    expect(unanchored).toEqual([lost])
  })

  it('на одной строке сначала самые серьёзные', () => {
    const low = makeFinding({ id: 'low', severity: 'low', new_line: 3 })
    const critical = makeFinding({ id: 'critical', severity: 'critical', new_line: 3 })
    const medium = makeFinding({ id: 'medium', severity: 'medium', new_line: 3 })

    const { byLine } = groupFindingsByLine([low, critical, medium])

    expect(byLine.new.get(3)?.map((finding) => finding.id)).toEqual(['critical', 'medium', 'low'])
  })
})
