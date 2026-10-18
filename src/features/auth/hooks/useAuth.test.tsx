import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { focusManager } from '@tanstack/react-query'

import { RequireAuth } from '@/features/auth'
import { navigation } from '@/shared/lib'
import { ME, renderWithQuery } from '@/test/api'

describe('useAuth: возврат в вкладку', () => {
  beforeEach(() => {
    vi.spyOn(navigation, 'assign').mockImplementation(() => {})
    window.history.pushState({}, '', '/app/')
    vi.useFakeTimers({ toFake: ['Date'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    focusManager.setFocused(undefined)
  })

  it('выход в другой вкладке: при возврате профиль перезапрашивается и 401 уводит на /login', async () => {
    const replies = [
      new Response(JSON.stringify(ME), { status: 200 }),
      new Response(null, { status: 401 }),
    ]
    const fetchMock = vi.fn(async () => replies.shift() as Response)
    vi.stubGlobal('fetch', fetchMock)

    renderWithQuery(<RequireAuth>кабинет</RequireAuth>)
    expect(await screen.findByText('кабинет')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Профиль протух, вкладка потеряла и вернула фокус.
    vi.setSystemTime(Date.now() + 60_000)
    act(() => focusManager.setFocused(false))
    act(() => focusManager.setFocused(true))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2F'))
  })

  it('свежий профиль при возврате не перезапрашивается', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(ME), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    renderWithQuery(<RequireAuth>кабинет</RequireAuth>)
    expect(await screen.findByText('кабинет')).toBeInTheDocument()

    act(() => focusManager.setFocused(false))
    act(() => focusManager.setFocused(true))

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
