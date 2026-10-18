import { describe, expect, it } from 'vitest'
import { rewriteAppUrl, rewriteStaticPage } from './appRoutes'

describe('rewriteAppUrl', () => {
  it.each([
    ['/app', '/app/index.html'],
    ['/app/', '/app/index.html'],
    ['/app/repositories', '/app/index.html'],
    ['/app/reviews/123', '/app/index.html'],
    ['/app/reviews/123/', '/app/index.html'],
  ])('%s отдаёт HTML приложения', (url, expected) => {
    expect(rewriteAppUrl(url)).toBe(expected)
  })

  it('сохраняет строку запроса и фрагмент', () => {
    expect(rewriteAppUrl('/app/oauth/callback?code=1&state=x')).toBe(
      '/app/index.html?code=1&state=x',
    )
    expect(rewriteAppUrl('/app?a=1')).toBe('/app/index.html?a=1')
  })

  it.each(['/app/assets/x.js', '/app/index.html', '/app/favicon.svg', '/app/assets/x.js?v=1'])(
    '%s — файл, не трогаем',
    (url) => {
      expect(rewriteAppUrl(url)).toBeNull()
    },
  )

  it.each([
    '/',
    '/nope',
    '/login',
    '/application',
    '/apps/x',
    '/assets/a.js',
    '/robots.txt',
    '/?app=1',
  ])('%s вне /app, не трогаем', (url) => {
    expect(rewriteAppUrl(url)).toBeNull()
  })
})

describe('rewriteStaticPage', () => {
  it('/login отдаёт файл страницы входа и сохраняет строку запроса', () => {
    expect(rewriteStaticPage('/login')).toBe('/login.html')
    expect(rewriteStaticPage('/login?error=denied')).toBe('/login.html?error=denied')
  })

  it.each(['/', '/login/', '/login.html', '/logins', '/app/login'])('%s не трогаем', (url) => {
    expect(rewriteStaticPage(url)).toBeNull()
  })
})
