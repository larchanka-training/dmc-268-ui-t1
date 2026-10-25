# Proposal

## Why

`pnpm api:check` выполнялся шагом job'а `typecheck`, хотя ходит в сеть (`raw.githubusercontent.com`, `api.github.com`). Сбой сети выглядел как красный typecheck и отправлял искать ошибку типов там, где её нет.

openspec во фронтовом репозитории — 1.14.3, в бэкенде — 1.14.2; последняя версия — 1.15.0. Версии расходятся, и `validate --strict` может давать разный результат.

Два change (`deploy-check-title`, `stand-http2-http3`) ждали только приёмки после деплоя, который давно зелёный, и висели незаархивированными.

## What Changes

- `pnpm api:check` вынесен из job'а `typecheck` в отдельный job `contract` с комментарием о сети.
- openspec 1.15.0 в `package.json` и `pnpm-lock.yaml`; сгенерированные скиллы `.agents/skills/openspec-*` обновлены `openspec update` (в них записана версия генератора).
- Приёмка закрыта, оба change заархивированы.

Что нового в 1.15.0 по сравнению с 1.14.3: `openspec update --dry-run`, автономная установка без Node.js, мелкие правки `--json` и `openspec new change`. Новых проверок `validate --strict` нет, формат `list --json` не менялся.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет.

`skip_specs: true`: меняется только CI и версия инструмента. Дельты архивируемых `deploy-check-title` и `stand-http2-http3` синхронизируются отдельно, их собственной архивацией.

## Impact

- `.github/workflows/ci.yml` (только `typecheck` и новый `contract`), `README.md`, `package.json`, `pnpm-lock.yaml`, `.agents/skills/openspec-*`.
- Проверяется прогоном CI: job `contract` исполняет `pnpm api:check`.
