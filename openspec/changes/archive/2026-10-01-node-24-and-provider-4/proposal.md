# Proposal

## Why

- **Node.js 22** ушёл в maintenance (поддержка до 30.04.2027). Актуальная Active LTS — 24.
- **pnpm 12.3.4** отстаёт от 12.8.1. Через Corepack версия берётся из `packageManager`, так что обновление — это правка одной строки.
- **nginx 1.27** — ветка, которая больше не получает исправлений; актуальная стабильная — 1.30. Это публичный вход стенда.
- **Провайдер `kreuzwerker/docker`** закреплён как `~> 3.0` без `.terraform.lock.hcl`: каждый `tofu init` в CI заново выбирает версию, хэши не закреплены. Бэкенд уже перешёл на `~> 4.6` с lock-файлом.

## What Changes

- Node 24: `.nvmrc`, `engines.node`, базовый образ сборки в `Dockerfile`; CI берёт версию из `.nvmrc`, а не из своей копии.
- `packageManager`: `pnpm@12.8.1`.
- Образ раздачи: `nginx:1.30-alpine`.
- Настройки pnpm переезжают из `.npmrc` в `pnpm-workspace.yaml` (`engineStrict`, `autoInstallPeers`), `.npmrc` удаляется. pnpm 12 из `.npmrc` их не читает: проверка `engines.node` не работала и до этого изменения — на Node 22 при `engines.node: ">=24"` установка проходила молча.
- `infra/versions.tf`: `~> 4.6`; `infra/.terraform.lock.hcl` с хэшами для пяти платформ; команда пересборки — в `infra/README.md`.

**Не входит:** Node 26 — станет LTS 28 октября 2026, но не поставляет Corepack, а спека `dependency-management` требует брать pnpm через него. Переход на 26 требует сначала решить, откуда брать pnpm.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `dependency-management`: «Фиксация версии Node.js» — мажорная версия 24 вместо 22; «pnpm-workspace конфигурация» — сюда переезжают `engineStrict` и `autoInstallPeers`; требование «Конфигурация .npmrc» удаляется.

## Impact

- `.nvmrc`, `package.json`, `pnpm-workspace.yaml`, удаляемый `.npmrc`, `Dockerfile`, `.github/workflows/ci.yml`, `infra/versions.tf`, новый `infra/.terraform.lock.hcl`, `README.md`, `infra/README.md`, `AGENTS.md`.
- **Разработчикам нужен Node 24**: из-за `engine-strict=true` на Node 22 `pnpm install` и git-хуки перестанут проходить. `nvm install && nvm use` в корне проекта.
- Провайдер v4 иначе обрабатывает остановленные контейнеры; у контейнера интерфейса `must_run` не задан, поведение не меняется. Подтверждает это повторный деплой того же коммита.
