import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RulesStatus } from '../model/settings'
import { RulesStatusBadge } from './RulesStatusBadge'

const withFile: RulesStatus = {
  status: 'loaded',
  branch: 'main',
  path: '.review/rules.md',
  rules: [],
  rejected: [],
  fetchedAt: '2026-10-11T09:40:00.000Z',
}

describe('RulesStatusBadge', () => {
  it('файл есть: бейдж сообщает о кастомных правилах, видны ветка и путь', () => {
    const { container } = render(<RulesStatusBadge status={withFile} />)

    expect(screen.getByText('Кастомные правила')).toBeInTheDocument()
    expect(container.textContent).toContain('ветка: main')
    expect(container.textContent).toContain('.review/rules.md')
  })

  it('файла нет: бейдж сообщает о дефолтных правилах, ветка и путь на месте', () => {
    const status: RulesStatus = { status: 'absent', branch: 'develop', path: '.review/rules.md' }
    const { container } = render(<RulesStatusBadge status={status} />)

    expect(screen.getByText('Дефолтные правила')).toBeInTheDocument()
    expect(container.textContent).toContain('ветка: develop')
    expect(container.textContent).toContain('.review/rules.md')
  })

  it('файл больше лимита: бейдж сообщает о слишком большом файле', () => {
    const status: RulesStatus = { status: 'too_large', branch: 'main', path: '.review/rules.md' }

    render(<RulesStatusBadge status={status} />)
    expect(screen.getByText('Файл правил слишком большой')).toBeInTheDocument()
  })

  it('файл недоступен: бейдж сообщает о недоступности правил', () => {
    const status: RulesStatus = { status: 'unavailable', branch: 'main', path: '.review/rules.md' }

    render(<RulesStatusBadge status={status} />)
    expect(screen.getByText('Правила недоступны')).toBeInTheDocument()
  })
})
