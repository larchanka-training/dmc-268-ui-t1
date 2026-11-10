# Proposal

## Why

Задача [#111](https://github.com/larchanka-training/dmc-268-ui-t1/issues/111), frontend-половина
родителя larchanka-training/dmc-268-api-t1#285. Бэкенд (larchanka-training/dmc-268-api-t1#396)
берёт деньги за ревью с баланса плательщика репозитория: без плательщика или без денег прогон
завершается без вызова модели. В кабинете этого не видно: пользователь не знает свой баланс, не
может стать плательщиком или отказаться от оплаты, а прогон без денег выглядит как чистое ревью
«можно мёржить».

## What Changes

- Контракт API синхронизирован с `develop` бэкенда (`pnpm api:sync`): `balance_eur` и
  `paid_repositories` в `GET /auth/me`, `payer_login` в строке `GET /repositories`, ручки
  `POST`/`DELETE /repositories/{id}/payer`, `coverage_reason` и `usage` у прогона,
  `coverage_reason` в строке списка прогонов. Поле `diff_expired_at` пришло с тем же контрактом и
  только разбирается схемой: показ удалённого диффа — отдельная задача.
- Баланс в шапке рядом с профилем и карточкой «Баланс» на «Обзоре»; сумма — из десятичной строки
  без перевода в число с плавающей точкой, отрицательная выделена.
- Блок «Я плачу за» на «Обзоре» (страницы профиля в кабинете нет): `paid_repositories` и кнопка
  «Перестать платить» у каждого.
- Колонка «Плательщик» на странице «Репозитории» и кнопка «Платить за этот репозиторий».
- Прогон с `coverage_reason = balance`: предупреждение «Недостаточно средств, ревью не было» с
  подсказкой на экране прогона вместо вердикта и «Замечаний нет», метка «Нет средств» в списке.
- «Стоимость» прогона рядом с «Токены».

**Не входит**: пополнение баланса из интерфейса (деньги зачисляет администратор), лимит размера
PR (change `review-limits`), показ удалённого по сроку диффа.

## Capabilities

### New Capabilities

- `cabinet-billing`: деньги в кабинете — баланс, оплачиваемые репозитории, плательщик
  репозитория, прогон без денег и стоимость прогона.

### Modified Capabilities

Нет.

## Impact

- Код: `src/shared/api/contract/*` (генерация), `src/shared/lib/format.ts` (`formatEuro`),
  `src/entities/session`, `src/entities/repository`, `src/entities/review-run`,
  `src/features/repository` (мутации плательщика), `src/features/auth`,
  `src/features/live-run-status` (перечитать `/auth/me` по `run.finished`), `src/pages/OverviewPage.tsx`,
  `src/pages/RepositoriesPage.tsx`, `src/pages/reviews`, `src/pages/review-run`,
  `src/widgets/app-shell`, `src/widgets/review-run-view`; `tsconfig.json` — библиотека
  `ES2023.Intl` для форматирования десятичной строки.
- Зависимости: новых нет.
