/**
 * Переходы за пределы SPA — на статичную `/login` и на лендинг — и перезагрузка
 * страницы. Объект, а не функция: тест подменяет метод, не трогая `window.location` jsdom.
 */
export const navigation = {
  assign(url: string): void {
    window.location.assign(url)
  },
  reload(): void {
    window.location.reload()
  },
}

/** Статичная страница входа с возвратом на текущий экран после входа. */
export function redirectToLogin(): void {
  const { pathname, search } = window.location
  navigation.assign(`/login?redirect=${encodeURIComponent(pathname + search)}`)
}
