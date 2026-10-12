# Proposal

## Why

pnpm ставился тремя разными способами: в CI — отдельным action `pnpm/action-setup`, в README первым вариантом шёл `npm install -g pnpm@12.3.4`, и только `Dockerfile` брал его из Node через Corepack. Версия в каждом случае задавалась по-своему, и `packageManager` в `package.json` был источником правды только для образа.

Node.js 22 поставляет Corepack в составе: он читает `packageManager` и запускает ровно эту версию pnpm. Отдельная установка ничего не добавляет, кроме ещё одного места, где версия может разойтись.

Заодно CI приводится к тому же виду, что в бэкенде: прогон по устаревшему коммиту отменяется, у токена только чтение, у джоб есть таймауты, actions переведены на Node 24 (Node 20 на раннерах объявлен устаревшим).

## What Changes

- `ci.yml`: `pnpm/action-setup` заменён на `corepack enable` до `setup-node`; `concurrency` с отменой прогонов пул-реквеста; `permissions: contents: read`; `timeout-minutes`.
- `ci.yml` и `deploy.yml`: `checkout` v7, `setup-node` v7, `setup-opentofu` v2, `setup-buildx` v4, `login` v4, `build-push` v7; таймауты у джоб деплоя.
- README: единственный способ получить pnpm — `corepack enable`.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `dependency-management`: требование «Фиксация версии pnpm» дополняется тем, что pnpm предоставляется Corepack из состава Node.js и отдельно не устанавливается.

## Impact

- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `README.md`.
- Разработчику один раз нужен `corepack enable`: без него git-хуки, которые вызывают `pnpm`, не найдут команду.
- Кеш pnpm в CI один раз промахнулся: путь хранилища у Corepack другой, чем у `pnpm/action-setup`, а путь входит в версию кеша.
