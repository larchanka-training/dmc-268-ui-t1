# Tasks

## 1. Скрипт

- [x] 1.1 `scripts/build-summary.mjs`: `collect` (метрики `dist/assets`) и `render` (markdown)
- [x] 1.2 `scripts/build-summary.sh`: `dist/assets` и размеры из образа
- [x] 1.3 `.github/tests/build-summary.test.mjs` на фикстурах: база есть и нет, trivy, hadolint, CLI

## 2. CI

- [x] 2.1 Job `image`: hadolint и trivy в json без падения, сбор метрик, summary
- [x] 2.2 База develop через кэш Actions: restore везде, save на push в develop

## 3. Проверка

- [x] 3.1 Прогон скрипта на локально собранном образе
