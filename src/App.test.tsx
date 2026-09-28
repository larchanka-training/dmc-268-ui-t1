import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('показывает экран входа для неавторизованного пользователя', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Войти через GitHub/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Войти через GitLab/i })).toBeInTheDocument()
  })
})
