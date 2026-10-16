import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { RequireAuth } from '@/features/auth'
import { navigation } from '@/shared/lib'
import { ME, renderWithQuery, stubFetch } from '@/test/api'

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.spyOn(navigation, 'assign').mockImplementation(() => {})
    window.history.pushState({}, '', '/app/')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('с сессией показывает кабинет', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    renderWithQuery(<RequireAuth>кабинет</RequireAuth>)

    expect(await screen.findByText('кабинет')).toBeInTheDocument()
  })

  it('без сессии не показывает кабинет и уводит на /login', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 401 } })

    renderWithQuery(<RequireAuth>кабинет</RequireAuth>)

    await waitFor(() => expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2F'))
    expect(screen.queryByText('кабинет')).not.toBeInTheDocument()
    expect(screen.queryByText('Не удалось загрузить профиль')).not.toBeInTheDocument()
  })

  it('ответ вне контракта — ошибка загрузки, а не пустой кабинет', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: { login: '' } } })

    renderWithQuery(<RequireAuth>кабинет</RequireAuth>)

    expect(await screen.findByText('Не удалось загрузить профиль')).toBeInTheDocument()
    expect(screen.queryByText('кабинет')).not.toBeInTheDocument()
  })
})
