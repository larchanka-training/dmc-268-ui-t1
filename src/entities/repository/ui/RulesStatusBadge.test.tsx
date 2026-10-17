import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RulesStatus } from '../model/settings'
import { RulesStatusBadge } from './RulesStatusBadge'

const withFile: RulesStatus = {
  status: 'loaded',
  branch: 'main',
  path: '.review/rules.md',
  rules: [
    {
      name: 'Security',
      patterns: ['app/**/*.py'],
      excludes: [],
      checks: ['Не хранить секреты в коде'],
    },
  ],
  rejected: [],
  fetchedAt: '2026-10-11T09:40:00.000Z',
}

/** api#49 отдаёт `loaded` и при пустом `rules`: файл пуст или все разделы отклонены. */
const emptyRules: RulesStatus = {
  status: 'loaded',
  branch: 'main',
  path: '.review/rules.md',
  rules: [],
  rejected: [{ name: 'Docs', reason: 'нет паттерна (pattern); нет проверок' }],
  fetchedAt: '2026-10-11T09:40:00.000Z',
}

describe('RulesStatusBadge', () => {
  it('правила применимы: бейдж сообщает о кастомных правилах, видны ветка и путь', () => {
    const { container } = render(<RulesStatusBadge status={withFile} />)

    expect(screen.getByText('Кастомные правила')).toBeInTheDocument()
    expect(container.textContent).toContain('ветка: main')
    expect(container.textContent).toContain('.review/rules.md')
  })

  it('файл без применимых правил: бейдж сообщает, что правила не применяются', () => {
    const { container } = render(<RulesStatusBadge status={emptyRules} />)

    expect(screen.getByText('Правила не применяются')).toBeInTheDocument()
    expect(screen.queryByText('Кастомные правила')).not.toBeInTheDocument()
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
