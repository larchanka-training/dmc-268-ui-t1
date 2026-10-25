# Tasks

## 1. Контракт отдельным job'ом

- [x] 1.1 `ci.yml`: `pnpm api:check` из `typecheck` в job `contract` без `needs`, с комментарием о сети; проверить, что `typecheck` остался с одним шагом `pnpm run typecheck`
- [x] 1.2 `README.md`: «шаг job'а `typecheck`» заменить на job `contract`; проверить `grep`, что других упоминаний нет

## 2. openspec 1.15.0

- [x] 2.1 `package.json` и `pnpm-lock.yaml` на 1.15.0 (`pnpm install --lockfile-only`); проверить `pnpm install --frozen-lockfile` и `openspec --version`
- [x] 2.2 `openspec update`, затем `prettier --write .agents/skills`; проверить, что в дифе скиллов только `generatedBy`
- [x] 2.3 `openspec validate --all --strict` на 1.15.0; проверить, что все элементы проходят

## 3. Архив

- [x] 3.1 Закрыть приёмку и заархивировать `deploy-check-title` и `stand-http2-http3`; проверить, что `openspec list` не показывает завершённых change
