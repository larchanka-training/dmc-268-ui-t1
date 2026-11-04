# Proposal

## Why

Change, у которого закрыты все задачи, но который не заархивирован, держит свои дельты вне `openspec/specs/`: источник правды о поведении отстаёт от кода. В `dmc-268-api-t1` это ловит `scripts/check_openspec_archived.py` в job'е `openspec`, во фронте такой проверки нет — и на `develop` лежали три завершённых, но незаархивированных change: `repository-settings`, `repositories-one-page`, `review-run-general-stream`.

## What Changes

- `scripts/check-openspec-archived.mjs` — порт проверки бэкенда на Node: читает `openspec list --json`, падает на change со всеми закрытыми задачами, открытые change выводит таблицей в summary прогона. Тест — `.github/tests/check-openspec-archived.test.mjs`.
- Шаг в job'е `openspec` (`ci.yml`) после `spec:validate`, `shell: bash` ради pipefail.
- Заархивированы `repository-settings`, `repositories-one-page`, а после приёмки 5.5 — `review-run-live-status` и зависящий от его спеки `review-run-general-stream`.

- Перед архивацией в дельтах `repositories-one-page` и `review-run-general-stream` ужаты требования, которые в итоговой спеке длиннее 500 символов и роняют `validate --strict` (в дельте эта проверка не срабатывает): фразы, дословно покрытые сценариями, убраны, правила истории поиска и снимка прогона вынесены в отдельные требования со своими сценариями. Поведение не меняется.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет.

`skip_specs: true`: меняется только CI. Дельты архивируемых change синхронизируются их собственной архивацией.

## Impact

- `.github/workflows/ci.yml` (только job `openspec`), `scripts/`, `.github/tests/`, `openspec/specs/` и `openspec/changes/archive/` — архивацией.
- Проверяется прогоном CI: job `openspec` зелёный, в summary — таблица открытых change.
