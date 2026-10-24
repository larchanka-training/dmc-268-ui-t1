import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

const isVisible = () => document.visibilityState !== 'hidden'

/**
 * Видна ли вкладка: `false`, пока она скрыта (`document.visibilityState === 'hidden'`).
 * Подписки на поток событий закрываются на скрытой вкладке — при возврате придёт `open`
 * и снимок REST. `useSyncExternalStore`, а не `useState` + эффект: переключение между
 * рендером и подпиской не теряется.
 */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, isVisible)
}
