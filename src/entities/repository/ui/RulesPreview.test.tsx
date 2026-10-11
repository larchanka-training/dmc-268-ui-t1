import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RulesStatus } from '../model/settings'
import { RulesPreview } from './RulesPreview'

const withFile: RulesStatus = {
  present: true,
  branch: 'main',
  path: '.review/rules.md',
  fetchedAt: '2026-10-11T09:40:00.000Z',
  sections: [
    {
      title: 'Security',
      entries: [
        { kind: 'rule', text: 'Не хранить секреты в `коде`' },
        { kind: 'ignore', text: 'vendor/**' },
      ],
    },
    {
      title: 'Style',
      entries: [{ kind: 'rule', text: 'Следовать `.editorconfig`' }],
    },
  ],
}

const withoutFile: RulesStatus = {
  present: false,
  branch: 'main',
  path: '.review/rules.md',
}

describe('RulesPreview', () => {
  it('правила найдены: секции с пунктами и тегом ignore у директив', () => {
    render(<RulesPreview status={withFile} />)

    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Style' })).toBeInTheDocument()
    expect(screen.getByText('vendor/**')).toBeInTheDocument()
    expect(screen.getByText('ignore')).toBeInTheDocument()
    // Инлайн-код из пунктов показан моноширинно (TextWithCode).
    expect(screen.getByText('коде').tagName).toBe('CODE')
    expect(screen.getByText('.editorconfig').tagName).toBe('CODE')
  })

  it('правил нет: предупреждение предложить создать .review/rules.md', () => {
    const { container } = render(<RulesPreview status={withoutFile} />)

    expect(screen.getByRole('note')).toBeInTheDocument()
    expect(container.textContent).toContain('Используются дефолтные правила')
    expect(container.textContent).toContain('.review/rules.md')
  })

  it.each([
    ['правила найдены', withFile],
    ['правил нет', withoutFile],
  ])('%s: в превью нет полей ввода', (_name, status) => {
    render(<RulesPreview status={status} />)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
