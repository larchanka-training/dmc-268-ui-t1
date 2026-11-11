import { Typography } from 'antd'

import { STRIPE_PAYMENT_LINK } from '@/shared/config/env'

const TOPUP_CAP_HINT = 'до лимита на аккаунт: оплата сверх него не зачисляется'

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
    <span>
      <Typography.Link href={href} className="text-meta">
        Пополнить
      </Typography.Link>{' '}
      <Typography.Text type="secondary" className="text-meta">
        {TOPUP_CAP_HINT}
      </Typography.Text>
    </span>
  )
}

/**
 * Адрес оплаты или `null`: кривая переменная не роняет «Обзор», свой query ссылки сохраняется,
 * а id пользователя уходит только на `https://buy.stripe.com`, не на хост из ошибочной переменной.
 */
function topupHref(userId: string): string | null {
  if (!STRIPE_PAYMENT_LINK) return null
  try {
    const url = new URL(STRIPE_PAYMENT_LINK)
    if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com') return null
    url.searchParams.set('client_reference_id', userId)
    return url.href
  } catch {
    return null
  }
}
