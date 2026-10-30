import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AppSidebar } from '@/widgets/app-shell/ui/AppSidebar'

describe('AppSidebar', () => {
  it('пункт «Помощь» в боковом меню ведёт на /help', async () => {
    function Path() {
      return <output>{useLocation().pathname}</output>
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppSidebar />
        <Path />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('menuitem', { name: /Помощь/ }))
    expect(screen.getByRole('status')).toHaveTextContent('/help')
  })
})
