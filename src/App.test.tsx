import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

describe('App', () => {
  it('renders the counter button', () => {
    render(<App />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('increments the counter on click', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Count is 0')
    await user.click(button)
    expect(button).toHaveTextContent('Count is 1')
  })
})
