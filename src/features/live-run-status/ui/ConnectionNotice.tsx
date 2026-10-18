import { Alert, Button } from 'antd'
import { useEffect, useState } from 'react'

import type { StreamState } from '../../../shared/api'

/** Через сколько обрыв считается долгим и показывается пользователю. */
export const RECONNECT_NOTICE_DELAY = 5_000

/** Монтируется только на время обрыва, поэтому таймер каждый раз начинается заново. */
function ReconnectingNotice() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), RECONNECT_NOTICE_DELAY)
    return () => clearTimeout(timer)
  }, [])

  if (!shown) return null
  return <Alert type="warning" showIcon title="Соединение потеряно, переподключаемся" />
}

type Props = {
  state: StreamState
  onRefresh: () => void
}

/** Состояние соединения: данные на экране остаются, плашка только объясняет, что они могут отставать. */
export function ConnectionNotice({ state, onRefresh }: Props) {
  if (state === 'reconnecting') return <ReconnectingNotice />
  if (state === 'failed') {
    return (
      <Alert
        type="error"
        showIcon
        title="Не удалось получить обновления статуса"
        action={
          <Button size="small" onClick={onRefresh}>
            Обновить
          </Button>
        }
      />
    )
  }
  return null
}
