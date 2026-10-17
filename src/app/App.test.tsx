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

  it('без сессии уводит с /app/reviews/42 на /login с возвратом на экран прогона', async () => {
    window.history.pushState({}, '', '/app/reviews/42')
    stubFetch({ 'GET /api/v1/auth/me': { status: 401 } })

    render(<App />)

    await waitFor(() =>
      expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2Freviews%2F42'),
    )
  })

  it('без сессии уводит с /app/repositories на /login с возвратом на этот экран', async () => {
    window.history.pushState({}, '', '/app/repositories')
    stubFetch({ 'GET /api/v1/auth/me': { status: 401 } })

    render(<App />)

    await waitFor(() =>
      expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2Frepositories'),
    )
    expect(screen.queryByText('larchanka-training/platform-api')).not.toBeInTheDocument()
  })

  it('с сессией глубокая ссылка /app/repositories открывает экран репозиториев', async () => {
    window.history.pushState({}, '', '/app/repositories')
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    render(<App />)

    expect(await screen.findByText('larchanka-training/platform-api')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/repositories')
  })

  it('неизвестный адрес под /app уводит на /app/', async () => {
    window.history.pushState({}, '', '/app/unknown')
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    render(<App />)

    expect(await screen.findByText('С возвращением, The Octocat')).toBeInTheDocument()
    // Роутер под basename сводит корень к `/app`, без слэша — это тот же обзор.
    expect(window.location.pathname).toMatch(/^\/app\/?$/)
  })
})
