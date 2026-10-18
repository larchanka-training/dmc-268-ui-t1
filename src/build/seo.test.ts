import { describe, expect, it } from 'vitest'
import {
  applyOrigin,
  buildRobotsTxt,
  buildSitemapXml,
  DEFAULT_PUBLIC_ORIGIN,
  normalizeOrigin,
} from './seo'

describe('normalizeOrigin', () => {
  it('без значения берёт адрес по умолчанию', () => {
    expect(normalizeOrigin(undefined)).toBe(DEFAULT_PUBLIC_ORIGIN)
    expect(normalizeOrigin('  ')).toBe(DEFAULT_PUBLIC_ORIGIN)
  })

  it('убирает завершающие слеши и пробелы', () => {
    expect(normalizeOrigin(' https://62.169.24.237/ ')).toBe('https://62.169.24.237')
    expect(normalizeOrigin('https://a.test//')).toBe('https://a.test')
  })
})

describe('applyOrigin', () => {
  it('подставляет адрес во все вхождения', () => {
    const html = '<link href="%PUBLIC_ORIGIN%/"><meta content="%PUBLIC_ORIGIN%/og.png">'
    expect(applyOrigin(html, 'https://h')).toBe(
      '<link href="https://h/"><meta content="https://h/og.png">',
    )
  })
})

describe('buildRobotsTxt', () => {
  it('разрешает корень, закрывает /app/ и /api/, указывает Sitemap', () => {
    const txt = buildRobotsTxt('https://h')
    expect(txt).toContain('Allow: /\n')
    expect(txt).toContain('Disallow: /app/\n')
    expect(txt).toContain('Disallow: /api/\n')
    expect(txt).toContain('Disallow: /login\n')
    expect(txt).toContain('Sitemap: https://h/sitemap.xml\n')
  })
})

describe('buildSitemapXml', () => {
  it('содержит абсолютный адрес лендинга', () => {
    expect(buildSitemapXml('https://h')).toContain('<loc>https://h/</loc>')
  })
})
