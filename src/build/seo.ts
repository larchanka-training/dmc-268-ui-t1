// Файлы для поисковых роботов и подстановка абсолютного адреса стенда.
// Адрес известен только при сборке образа (аргумент PUBLIC_ORIGIN).

export const DEFAULT_PUBLIC_ORIGIN = 'http://localhost:3000'

/** Плейсхолдер адреса стенда в HTML лендинга. */
export const ORIGIN_PLACEHOLDER = '%PUBLIC_ORIGIN%'

/** Убирает пробелы и завершающие слеши: `https://host/` → `https://host`. */
export function normalizeOrigin(value: string | undefined): string {
  const origin = (value ?? '').trim().replace(/\/+$/, '')
  return origin === '' ? DEFAULT_PUBLIC_ORIGIN : origin
}

export function applyOrigin(html: string, origin: string): string {
  return html.split(ORIGIN_PLACEHOLDER).join(origin)
}

export function buildRobotsTxt(origin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /app/',
    'Disallow: /api/',
    'Disallow: /login',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
}

export function buildSitemapXml(origin: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${origin}/</loc></url>`,
    '</urlset>',
    '',
  ].join('\n')
}
