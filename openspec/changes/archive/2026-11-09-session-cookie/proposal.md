## Why

Бэкенд (api#47, change `auth-session`) сам выполняет OAuth и ставит сессию в httpOnly cookie `session`. Кабинет из #16 сделан под прежнее предложение: обмен кода в SPA, access- и refresh-токены, профиль в `localStorage`, `Authorization` в запросах, собственные экраны `/login` и `/oauth/callback`. После #25 приложение живёт под `/app/`, а вход — статичная `/login`, и кабинет со старой схемой там не откроется.

## What Changes

- Из SPA уходят обмен кода, страница `/oauth/callback`, экран входа, хранение и обновление токенов, `Authorization` и профиль в `localStorage`.
- Профиль — из `GET /api/v1/auth/me` через TanStack Query. Ответ `401` от любой ручки API — переход на статичную `/login?redirect=<текущий путь>`, после входа бэкенд возвращает на тот же экран.
- Запросы к API идут с `credentials: 'include'`.
- Выход — `POST /api/v1/auth/logout`, затем переход на `/`.
- Роутер под `basename="/app"`. Задача 4.1 change `landing-page` (#25) делается здесь.
- Мок: dev-сервер Vite отвечает на `/api/v1/auth/me` и `/api/v1/auth/logout` по наличию cookie `session` — так же, как nginx пускает в `/app/`. Экраны о моке не знают.

## Capabilities

### New Capabilities

### Modified Capabilities

- `cabinet-auth`: сессия на бэкенде в cookie вместо токенов в SPA.
- `cabinet-shell`: приложение под `/app`.

## Impact

- `src/entities/session`, `src/features/auth`, `src/pages/LoginPage*`, `src/pages/OAuthCallbackPage*`, `src/app/router`, `src/widgets/app-shell`, `src/shared/config/env.ts`, `vite.config.ts`.
- Зависит от #25 (`/app/`, статичная `/login`) и api#47 (`/api/v1/auth/*`). Мёржится сразу после #25.
