# Proposal

## Why

Задача [#145](https://github.com/larchanka-training/dmc-268-ui-t1/issues/145), frontend-половина
родителя larchanka-training/dmc-268-api-t1#411. Баланс пока пополняет только администратор;
бэкенд (api#412) зачисляет оплату Stripe по вебхуку, и пользователю нужен способ заплатить из
кабинета и увидеть результат.

## What Changes

- Контракт API синхронизирован с `develop` бэкенда: `id` в `GET /auth/me`.
- Ссылка «Пополнить» в карточке «Баланс» на «Обзоре»: Payment Link Stripe с
  `client_reference_id = id пользователя`. Адрес задаёт переменная сборки
  `VITE_STRIPE_PAYMENT_LINK`; без неё ссылки нет. Buy Button не берём (ей нужен домен, стенд
  открывается по IP), скрипт Stripe не грузится, CSP не меняется.
- Возврат из Stripe (`?topup=success&session_id=…`): закрываемое уведомление (баланс обновится
  в течение минуты, пополнение ограничено суммой на аккаунт), чистый адрес, перечитывание
  `/auth/me` 60 секунд.
- Переменная передаётся в сборку образа в `Dockerfile`, `ci.yml` и `deploy.yml`.

## Capabilities

### Modified Capabilities

- `cabinet-billing`: пополнение баланса.

## Impact

- Код: `src/shared/api/contract/*`, `src/shared/config/env.ts`, `src/entities/session`,
  `src/features/topup`, `src/pages/OverviewPage.tsx`.
- Сборка: `Dockerfile`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `README.md`.
- Переменная репозитория `VITE_STRIPE_PAYMENT_LINK` заводится отдельно, вручную.
