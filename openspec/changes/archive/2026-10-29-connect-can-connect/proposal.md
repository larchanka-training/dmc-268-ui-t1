# Proposal

## Why

На `/repositories/connect` у каждого неподключённого репозитория — активная кнопка «Подключить». В списке видны репозитории с любой ролью пользователя на GitHub, а подключить можно только с admin или maintain: остальным кнопка даёт `403 REPOSITORY_MANAGE_REQUIRED` уже после нажатия. Бэкенд теперь отдаёт в строке `GET /repositories/available` признак `can_connect` (dmc-268-api-t1#233). Задача #45, фронтенд — #46.

## What Changes

- `pnpm api:sync` на коммит бэкенда с `can_connect`; zod-схема `AvailableRepositorySchema` — с полем.
- `/repositories/connect`: при `can_connect = false` кнопка «Подключить» неактивна, подсказка — «Нужны права admin или maintain в репозитории на GitHub».
- Синхронизация подтянула и `covered_by_finding_id` у находки прогона (`FindingResponse`, dmc-268-api-t1#186): поле в `ReviewFindingSchema`, чтобы разбор совпадал с контрактом. Интерфейс его пока не показывает.
- Мок `GET /repositories/available` отдаёт `can_connect`, один репозиторий — без прав.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `cabinet-repositories`: ADDED «Кнопка подключения по правам».

## Impact

- `src/entities/repository/model/schema.ts`, `src/entities/review-finding/model/schema.ts`, `src/pages/ConnectRepositoryPage.tsx`, `src/app/mocks/repositories.ts`, тесты страницы, `src/shared/api/contract/*`.
- Мёрж — после мёржа dmc-268-api-t1#233: `pnpm api:check` пропускает только коммит из develop бэкенда; перед мёржем — `pnpm api:sync` на голову develop.
