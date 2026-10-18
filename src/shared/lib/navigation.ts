/**
 * Переходы за пределы SPA — на статичную `/login` и на лендинг. Объект, а не
 * функция: тест подменяет `assign`, не трогая `window.location` jsdom.
 */
export const navigation = {
  assign(url: string): void {
    window.location.assign(url)
  },
}

/** Статичная страница входа с возвратом на текущий экран после входа. */
export function redirectToLogin(): void {
  const { pathname, search } = window.location
  navigation.assign(`/login?redirect=${encodeURIComponent(pathname + search)}`)
}
