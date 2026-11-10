# Tasks

## 1. Контракт и сборка

- [x] 1.1 `pnpm api:sync` до головы `develop` бэкенда: `id` в `UserResponse`; схема, `CurrentUser` и фикстура `ME` несут `id`
- [x] 1.2 `VITE_STRIPE_PAYMENT_LINK`: `env.ts`, `vite-env.d.ts`, `Dockerfile`, `ci.yml`, `deploy.yml`, README

## 2. Ссылка и возврат из Stripe

- [x] 2.1 Ссылка «Пополнить» в карточке «Баланс»; без переменной её нет
- [x] 2.2 `TopupNotice` и `TopupLink` (`src/features/topup`): закрываемое уведомление, очистка адреса, перечитывание `/auth/me` минуту; тесты — адрес, возврат, остановка опроса, закрытие
