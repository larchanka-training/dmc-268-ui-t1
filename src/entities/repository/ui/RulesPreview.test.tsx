import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RulesStatus } from '../model/settings'
import { RulesPreview } from './RulesPreview'

const withFile: RulesStatus = {
  status: 'loaded',
  branch: 'main',
  path: '.review/rules.md',
  fetchedAt: '2026-10-11T09:40:00.000Z',
  rules: [
    {
      name: 'Security',
      patterns: ['app/**/*.py'],
      excludes: ['**/tests/**'],
      checks: ['Не хранить секреты в `коде`', 'Проверять зависимости'],
    },
    {
      name: 'Style',
      patterns: ['src/**/*.{ts,tsx}'],
      excludes: [],
      checks: ['Следовать `.editorconfig`'],
    },
  ],
  rejected: [{ name: 'Docs', reason: 'нет паттерна (pattern); нет проверок' }],
}

const withoutFile: RulesStatus = {
  status: 'absent',
  branch: 'main',
  path: '.review/rules.md',
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

describe('RulesPreview', () => {
  it('правила найдены: имя, паттерны области действия и нумерованные проверки', () => {
    render(<RulesPreview status={withFile} />)

    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Style' })).toBeInTheDocument()
    // Паттерны области действия — чипами с видом паттерна.
    expect(screen.getByText('pattern: app/**/*.py')).toBeInTheDocument()
    expect(screen.getByText('exclude: **/tests/**')).toBeInTheDocument()
    // Проверки — текстом, инлайн-код из них показан моноширинно (TextWithCode).
    expect(screen.getByText('Проверять зависимости')).toBeInTheDocument()
    expect(screen.getByText('коде').tagName).toBe('CODE')
    expect(screen.getByText('.editorconfig').tagName).toBe('CODE')
  })

  it('отклонённые разделы показываются с причиной', () => {
    render(<RulesPreview status={withFile} />)

    expect(screen.getByText('Отклонённые разделы — не применяются:')).toBeInTheDocument()
    expect(screen.getByText('Docs — нет паттерна (pattern); нет проверок')).toBeInTheDocument()
  })

  it('ни одно правило не применилось: стандартные критерии и отклонённые разделы с причинами', () => {
    const { container } = render(<RulesPreview status={emptyRules} />)

    expect(screen.getByRole('note')).toBeInTheDocument()
    expect(container.textContent).toContain('ревью идёт по стандартным критериям')
    expect(screen.getByText('Docs — нет паттерна (pattern); нет проверок')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('правил нет: предупреждение предложить создать .review/rules.md', () => {
    const { container } = render(<RulesPreview status={withoutFile} />)

    expect(screen.getByRole('note')).toBeInTheDocument()
    expect(container.textContent).toContain('Используются дефолтные правила')
    expect(container.textContent).toContain('.review/rules.md')
  })

  it.each([
    ['файл больше лимита', { status: 'too_large', branch: 'main', path: '.review/rules.md' }],
    ['файл недоступен', { status: 'unavailable', branch: 'main', path: '.review/rules.md' }],
  ] as const)('%s: сообщение о ревью по стандартным критериям', (_name, status) => {
    const { container } = render(<RulesPreview status={status} />)

    expect(container.textContent).toContain('ревью идёт по стандартным критериям')
  })

  it.each([
    ['правила найдены', withFile],
    ['правила не применяются', emptyRules],
    ['правил нет', withoutFile],
    ['файл больше лимита', { status: 'too_large', branch: 'main', path: '.review/rules.md' }],
    ['файл недоступен', { status: 'unavailable', branch: 'main', path: '.review/rules.md' }],
  ] as const)('%s: в превью нет полей ввода', (_name, status) => {
    render(<RulesPreview status={status} />)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
