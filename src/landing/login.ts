// Скрипт статичной страницы входа (login.html). Подключён в конце <body> как
// модуль: страница уже отрисована, скрипт её не задерживает. Без JS вход
// работает, теряются только возврат на исходную страницу и текст ошибки.

/**
 * Применяет параметры адреса страницы входа:
 * - `redirect` дописывается к ссылкам входа `a[data-provider]`, чтобы после
 *   входа бэкенд вернул на исходную страницу. Проверяет его бэкенд, здесь он
 *   передаётся как есть;
 * - `error` показывает блок `[data-errors]` и в нём свёрстанное сообщение
 *   `[data-error="<код>"]`, для незнакомого кода — `[data-error="unknown"]`.
 */
export function applyLoginParams(root: ParentNode, search: string): void {
  const params = new URLSearchParams(search)

  const redirect = params.get('redirect')
  if (redirect) {
    for (const link of root.querySelectorAll<HTMLAnchorElement>('a[data-provider]')) {
      const href = link.getAttribute('href') ?? ''
      const queryStart = href.indexOf('?')
      const path = queryStart === -1 ? href : href.slice(0, queryStart)
      const query = new URLSearchParams(queryStart === -1 ? '' : href.slice(queryStart))
      query.set('redirect', redirect)
      link.setAttribute('href', `${path}?${query}`)
    }
  }

  const error = params.get('error')
  if (error) {
    const messages = [...root.querySelectorAll<HTMLElement>('[data-error]')]
    const message =
      messages.find((el) => el.dataset.error === error) ??
      messages.find((el) => el.dataset.error === 'unknown')
    if (message) {
      message.hidden = false
      const box = message.closest<HTMLElement>('[data-errors]')
      if (box) box.hidden = false
    }
  }
}

applyLoginParams(document, window.location.search)
