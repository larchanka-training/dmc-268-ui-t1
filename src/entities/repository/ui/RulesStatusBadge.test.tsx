import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RulesStatus } from '../model/settings'
import { RulesStatusBadge } from './RulesStatusBadge'

const withFile: RulesStatus = {
  present: true,
  branch: 'main',
  path: '.review/rules.md',
  sections: [],
  fetchedAt: '2026-10-11T09:40:00.000Z',
}

const withoutFile: RulesStatus = {
  present: false,
  branch: 'develop',
  path: '.review/rules.md',
}

describe('RulesStatusBadge', () => {
  it('файл есть: бейдж сообщает о кастомных правилах, видны ветка и путь', () => {
    const { container } = render(<RulesStatusBadge status={withFile} />)

    expect(screen.getByText('Кастомные правила')).toBeInTheDocument()
    expect(container.textContent).toContain('ветка: main')
    expect(container.textContent).toContain('.review/rules.md')
  })

  it('файла нет: бейдж сообщает о дефолтных правилах, ветка и путь на месте', () => {
    const { container } = render(<RulesStatusBadge status={withoutFile} />)

    expect(screen.getByText('Дефолтные правила')).toBeInTheDocument()
    expect(container.textContent).toContain('ветка: develop')
    expect(container.textContent).toContain('.review/rules.md')
  })
})
