import { useState } from 'react'
import { Alert } from 'antd'

import { useTopupReturn } from '@/features/topup/model/useTopupReturn'

/** Уведомление после возврата из Stripe; без возврата в адресе ничего не рисует. */
export function TopupNotice({ className }: { className?: string }) {
  const returned = useTopupReturn()
  const [closed, setClosed] = useState(false)
  if (!returned || closed) return null
  return (
    <Alert
      showIcon
      closable={{ onClose: () => setClosed(true) }}
      className={className}
      type="info"
      title="Оплата принята, баланс обновится в течение минуты. Пополнение через Stripe ограничено суммой на аккаунт: если баланс не изменился, обратитесь к администратору."
    />
  )
}
