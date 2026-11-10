import { Typography } from 'antd'

import { STRIPE_PAYMENT_LINK } from '@/shared/config/env'

/**
 * Ссылка «Пополнить» на Payment Link Stripe: по `client_reference_id` вебхук находит, чей баланс
 * пополнить. Без `VITE_STRIPE_PAYMENT_LINK` пополняет администратор.
 */
export function TopupLink({ userId }: { userId: string }) {
  const href = topupHref(userId)
  if (!href) {
    return (
      <Typography.Text type="secondary" className="text-meta">
        Пополняет администратор сервиса
      </Typography.Text>
    )
  }
  return (
    <Typography.Link href={href} className="text-meta">
      Пополнить
    </Typography.Link>
  )
}

/** Адрес оплаты или `null`: кривая переменная не роняет «Обзор», а свой query ссылки сохраняется. */
function topupHref(userId: string): string | null {
  if (!STRIPE_PAYMENT_LINK) return null
  try {
    const url = new URL(STRIPE_PAYMENT_LINK)
    url.searchParams.set('client_reference_id', userId)
    return url.href
  } catch {
    return null
  }
}
