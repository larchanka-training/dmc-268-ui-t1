import { beforeEach, describe, expect, it } from 'vitest'
import { applyLoginParams } from './login'

// Разметка — та же, что в login.html: ссылки входа и скрытые сообщения.
function render() {
  document.body.innerHTML = `
    <div data-errors hidden>
      <p data-error="denied" hidden>Вход отменён</p>
      <p data-error="state_mismatch" hidden>Начните вход заново</p>
      <p data-error="provider_unavailable" hidden>Провайдер не отвечает</p>
      <p data-error="unknown" hidden>Не удалось войти</p>
    </div>
    <a data-provider="github" href="/api/v1/auth/github/login">GitHub</a>
    <a data-provider="gitlab" href="/api/v1/auth/gitlab/login">GitLab</a>
    <a href="/">На главную</a>
  `
}

const href = (selector: string) => document.querySelector(selector)?.getAttribute('href')
const boxHidden = () => document.querySelector<HTMLElement>('[data-errors]')!.hidden
const visible = () =>
  [...document.querySelectorAll<HTMLElement>('[data-error]')]
    .filter((el) => !el.hidden)
    .map((el) => el.dataset.error)

describe('applyLoginParams', () => {
  beforeEach(render)

  it('дописывает redirect к ссылкам входа', () => {
    applyLoginParams(document, '?redirect=/app/reviews/42')

    expect(href('[data-provider="github"]')).toBe(
      '/api/v1/auth/github/login?redirect=%2Fapp%2Freviews%2F42',
    )
    expect(href('[data-provider="gitlab"]')).toBe(
      '/api/v1/auth/gitlab/login?redirect=%2Fapp%2Freviews%2F42',
    )
  })

  it('не трогает ссылки, кроме входа', () => {
    applyLoginParams(document, '?redirect=/app/reviews/42')

    expect(href('a:not([data-provider])')).toBe('/')
  })

  it('кодирует redirect, чтобы & и # не порвали адрес входа', () => {
    applyLoginParams(document, '?redirect=' + encodeURIComponent('/app/a&b#c'))

    const url = new URL(href('[data-provider="github"]')!, 'http://x')
    expect(url.pathname).toBe('/api/v1/auth/github/login')
    expect(url.hash).toBe('')
    expect([...url.searchParams]).toEqual([['redirect', '/app/a&b#c']])
  })

  it('без redirect ссылки не меняются', () => {
    applyLoginParams(document, '?error=denied')

    expect(href('[data-provider="github"]')).toBe('/api/v1/auth/github/login')
  })

  it('пустой redirect ссылки не меняет', () => {
    applyLoginParams(document, '?redirect=')

    expect(href('[data-provider="github"]')).toBe('/api/v1/auth/github/login')
  })

  it.each(['denied', 'state_mismatch', 'provider_unavailable'])(
    'error=%s показывает своё сообщение и только его',
    (code) => {
      applyLoginParams(document, `?error=${code}`)

      expect(visible()).toEqual([code])
      expect(boxHidden()).toBe(false)
    },
  )

  it('незнакомый код показывает общее сообщение', () => {
    applyLoginParams(document, '?error=boom')

    expect(visible()).toEqual(['unknown'])
  })

  it('код не подставляется в селектор: кавычки в нём не ломают страницу', () => {
    applyLoginParams(document, '?error=' + encodeURIComponent('"] , a'))

    expect(visible()).toEqual(['unknown'])
  })

  it('без error сообщения и блок скрыты', () => {
    applyLoginParams(document, '?redirect=/app/')

    expect(visible()).toEqual([])
    expect(boxHidden()).toBe(true)
  })

  it('redirect и error работают вместе', () => {
    applyLoginParams(document, '?redirect=/app/repositories&error=denied')

    expect(visible()).toEqual(['denied'])
    expect(href('[data-provider="github"]')).toBe(
      '/api/v1/auth/github/login?redirect=%2Fapp%2Frepositories',
    )
  })
})
