import { WalletOutlined } from '@ant-design/icons'
import { Button, Grid, Typography } from 'antd'

import { STRIPE_PAYMENT_LINK } from '@/shared/config/env'

const TOPUP_CAP_HINT = 'до лимита на аккаунт: оплата сверх него не зачисляется'

/**
 * Кнопка «Пополнить» в карточке «Баланс» на Payment Link Stripe: по `client_reference_id` вебхук
 * находит, чей баланс пополнить. Без `VITE_STRIPE_PAYMENT_LINK` пополняет администратор.
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
    <div className="mt-3">
      <Button type="primary" icon={<WalletOutlined aria-hidden />} href={href}>
        Пополнить
      </Button>
      <Typography.Paragraph type="secondary" className="text-meta mt-1 mb-0">
        {TOPUP_CAP_HINT}
      </Typography.Paragraph>
    </div>
  )
}

/**
 * «Пополнить баланс» в шапке кабинета: прямая ссылка на оплату, уже `lg` только иконка (рядом
 * сайдбар). Про лимит говорят карточка «Баланс» и уведомление после возврата из Stripe.
 */
export function TopupHeaderButton({ userId }: { userId: string }) {
  const screens = Grid.useBreakpoint()
  const href = topupHref(userId)
  if (!href) return null
  return (
    <Button
      type="primary"
      icon={<WalletOutlined aria-hidden />}
      href={href}
      aria-label={screens.lg ? undefined : 'Пополнить баланс'}
    >
      {screens.lg && 'Пополнить баланс'}
    </Button>
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
