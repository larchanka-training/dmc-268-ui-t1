// Правило, по которому dev- и preview-сервер Vite отдают приложение под /app.
// То же правило записано в nginx/site.conf (location /app/): изменяя одно,
// меняйте и другое.

const APP_HTML = '/app/index.html'

/**
 * Возвращает новый URL запроса или `null`, если запрос переписывать не нужно.
 * `/app` и любой путь под `/app/` без расширения файла отдают HTML приложения;
 * файлы (`/app/assets/x.js`) и пути вне `/app` остаются как есть. Строка
 * запроса сохраняется.
 */
export function rewriteAppUrl(url: string): string | null {
  const queryStart = url.search(/[?#]/)
  const path = queryStart === -1 ? url : url.slice(0, queryStart)
  const query = queryStart === -1 ? '' : url.slice(queryStart)

  if (path !== '/app' && !path.startsWith('/app/')) return null
  if (path === APP_HTML) return null

  const lastSegment = path.slice(path.lastIndexOf('/') + 1)
  if (lastSegment.includes('.')) return null

  return APP_HTML + query
}

// Статичные страницы с адресом без .html. На стенде их перечисляет
// nginx/site.conf (location = /login), здесь — то же для dev-сервера.
const STATIC_PAGES: Record<string, string> = { '/login': '/login.html' }

/** Возвращает URL файла статичной страницы или `null`. Строка запроса сохраняется. */
export function rewriteStaticPage(url: string): string | null {
  const queryStart = url.search(/[?#]/)
  const path = queryStart === -1 ? url : url.slice(0, queryStart)
  const page = STATIC_PAGES[path]
  return page ? page + (queryStart === -1 ? '' : url.slice(queryStart)) : null
}
