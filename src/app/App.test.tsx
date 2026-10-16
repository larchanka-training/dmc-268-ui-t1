import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { App } from '@/app/App'
import { navigation } from '@/shared/lib'
import { ME, stubFetch } from '@/test/api'

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(navigation, 'assign').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('без сессии уводит с /app/ на статичную /login', async () => {
    window.history.pushState({}, '', '/app/')
    stubFetch({ 'GET /api/v1/auth/me': { status: 401 } })

    render(<App />)

    await waitFor(() => expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2F'))
  })

  it('с сессией открывает обзор под /app/', async () => {
    window.history.pushState({}, '', '/app/')
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    render(<App />)

    expect(await screen.findByText('С возвращением, The Octocat')).toBeInTheDocument()
  })
})
