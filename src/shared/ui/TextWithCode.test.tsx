import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TextWithCode } from './TextWithCode'

describe('TextWithCode', () => {
  it('показывает фрагменты в обратных кавычках как код', () => {
    render(
      <p>
        <TextWithCode text="Вызов `dict(row)` упадёт" />
      </p>,
    )

    expect(screen.getByText('dict(row)').tagName).toBe('CODE')
    expect(screen.getByRole('paragraph')).toHaveTextContent('Вызов dict(row) упадёт')
  })

  it('непарная кавычка остаётся текстом', () => {
    render(
      <p>
        <TextWithCode text="значение `x" />
      </p>,
    )

    expect(screen.getByRole('paragraph')).toHaveTextContent('значение `x')
  })
})
