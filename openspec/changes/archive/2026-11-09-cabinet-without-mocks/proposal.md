## Why

Кабинет ходит в данные через `ApiTransport` и `EventStream`, и реализаций у них две: HTTP-клиент с `EventSource` и mock adapter со сценарным потоком (`src/app/mocks/`), а вход в dev-сервере отвечает моком (`src/build/mockAuth.ts`). Стенд с #39 собирается без моков, а в `develop` бэкенда дифф, настройки и статус правил реализованы. Заглушкой `501` остался только `POST /reviews` (api#273), и кабинет его не вызывает. Моки стали второй реализацией контракта, которую надо поддерживать без пользы, а экран прогона молча показывает замечания списком, когда бэкенд объясняет, почему диффа нет.

## What Changes

- **BREAKING** Приложение всегда собирает HTTP-клиент к `/api/v1` и поток на `EventSource`. Mock adapter, сценарный поток и флаг `VITE_USE_MOCK_API` удаляются: из кода, `Dockerfile`, `ci.yml`, `deploy.yml` и переменных репозитория.
- **BREAKING** Dev-сервер больше не отвечает моком на `/api/v1/auth/*`: `pnpm dev` всегда проксирует `/api` на `VITE_API_PROXY_TARGET`. Локальная разработка — против локального бэкенда со своей GitHub App, это описывает README.
- Тег образа интерфейса — только sha коммита, без суффикса `-mock|-api`. Шаг CI «Мока входа нет в образе» удаляется: мока больше нет.
- Тесты, которые шли через mock adapter, переходят на фейк транспорта и потока из `src/test`.
- Контракт синхронизируется с `develop` бэкенда: у `GET /reviews/{id}/diff` появились `DIFF_TOO_LARGE` (422) и `DIFF_UNAVAILABLE` (409). Экран прогона показывает причину, почему диффа нет, и не повторяет запрос при постоянной ошибке.

## Capabilities

### New Capabilities

### Modified Capabilities

- `cabinet-shell`: источник данных — только бэкенд, без mock adapter.
- `cabinet-auth`: мок сессии в dev-сервере заменён проксированием на бэкенд.
- `frontend-delivery`: тег образа без источника данных.
- `review-run-view`: дифф больше не заглушка, причина ошибки диффа показана на экране.

## Impact

- Код: `src/app/App.tsx`, `src/app/mocks/` (удаляется, вместе с моком `/status` из #119), `src/build/mockAuth.ts` (удаляется), `src/shared/config/env.ts`, `src/vite-env.d.ts`, `vite.config.ts`, `src/pages/review-run`, `src/app/App.test.tsx`, `src/entities/session/api/sessionApi.test.ts`.
- Контракт: `src/shared/api/contract/*` через `pnpm api:sync`.
- Сборка и доставка: `Dockerfile`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, переменная репозитория `VITE_USE_MOCK_API`, фикстуры тегов в `.github/tests/deploy-report.test.mjs` и `infra/tests/main.tftest.hcl`.
- Документация: `README.md`, `docs/testing/TEST_PLAN.md`, `FRONTEND_ARCHITECTURE.md`.
- Порядок: ветка на `develop` после #118 (архив `repository-settings`, `repositories-one-page`, `review-run-live-status`, `review-run-general-stream`). Дельты написаны поверх спек после архива `session-cookie` и `review-run-diff-viewer`, поэтому этот change архивируется после них — задача 8.1, порядок в #130.
