# Tasks

## 1. Node 24

- [x] 1.1 `.nvmrc`, `engines.node`, `FROM node:24-alpine` в `Dockerfile`; `node-version-file: .nvmrc` в `ci.yml`
- [x] 1.2 Упоминания Node 22 в `README.md` и `AGENTS.md`

## 2. pnpm

- [x] 2.1 `packageManager: pnpm@12.8.1`; `pnpm install` не меняет `pnpm-lock.yaml` либо изменение закоммичено

- [x] 2.2 `engineStrict` и `autoInstallPeers` в `pnpm-workspace.yaml`, `.npmrc` удалить; проверить, что на Node 22 установка падает с `ERR_PNPM_UNSUPPORTED_ENGINE`, а на Node 24 проходит

## 2a. nginx

- [x] 2a.1 `FROM nginx:1.30-alpine`; поведение раздачи на 1.30 совпадает с 1.27

## 3. Провайдер

- [x] 3.1 `~> 4.6` в `infra/versions.tf`, lock-файл на пять платформ, команда в `infra/README.md`

## 4. Приёмка

- [x] 4.1 Локально на Node 24: install, typecheck, lint, test, build; образ собирается
- [x] 4.2 Зелёный CI
- [ ] 4.3 Деплой проходит, повторный деплой того же коммита даёт `No changes` (после мёржа в `develop`)

## Примечания к выполнению

4.1 — локально на Node 24.21.0 и pnpm 12.8.1: install, typecheck, lint, test (4/4), build зелёные; образ собирается, `nginx -t` проходит. На Node 22 `pnpm install` падает с `ERR_PNPM_UNSUPPORTED_ENGINE` — до переноса настроек в `pnpm-workspace.yaml` та же установка проходила молча. `pnpm-lock.yaml` изменился законно: pnpm 12 записывает туда собственную версию (`packageManagerDependencies`).

2a.1 — оба образа запущены рядом с заглушкой `dmc268-api` в одной docker-сети, ответы совпали: `/api/v1/foo?x=1` → `/v1/foo?x=1` и `/api/health` → `/health` на бэкенде, `/some/route` → 200 с `index.html`, `Cache-Control: no-cache` у `index.html` и `public, max-age=31536000, immutable` у `/assets/*`, 404 на отсутствующий ассет, ошибок в логе нет (1.27.5 и 1.30.5).

4.2: [CI 36789059261](https://github.com/larchanka-training/dmc-268-ui-t1/actions/runs/36789059261) зелёный — Node 24.21.0, pnpm 12.8.1 через Corepack, провайдер v4.6.0. Change заархивирован до деплоя: 4.3 выполнима только после мёржа в `develop`.
