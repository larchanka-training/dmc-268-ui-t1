# Tasks

## 1. CI

- [x] 1.1 Composite action `.github/actions/setup`: corepack, Node из `.nvmrc`, `pnpm install --frozen-lockfile`
- [x] 1.2 Job `syntax` → `typecheck`; в `lint` — `stylelint` и `format:check`
- [x] 1.3 `@fission-ai/openspec` 1.14.1 в `devDependencies`, скрипт `spec:validate`, job `openspec`
- [x] 1.4 Проверка API в `deploy.yml` — цикл ожидания до минуты

## 2. Спеки

- [x] 2.1 `cabinet-mock-oauth`: сценарии у «Protected routes» и «Filter available repositories»
- [x] 2.2 `review-run-diff-viewer`: REMOVED «Smoke-тест App», ADDED «Smoke-тест экрана прогона»
- [x] 2.3 `git-hooks`: установка хуков через поведение

## 3. Приёмка

- [x] 3.1 Локально: `typecheck`, `lint`, `stylelint`, `format:check`, `test`, `spec:validate` проходят
- [x] 3.2 Цикл проверки API: дожидается API после двух ответов 502, при стабильном 502 падает с ошибкой
- [x] 3.3 CI пул-реквеста зелёный с новыми job'ами
