import { useEffect, useState } from 'react'

/**
 * Видна ли вкладка: `false`, пока она скрыта (`document.visibilityState === 'hidden'`).
 * Подписки на поток событий закрываются на скрытой вкладке — при возврате придёт `open`
 * и снимок REST.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden')
  useEffect(() => {
    const onVisibilityChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])
  return visible
}
