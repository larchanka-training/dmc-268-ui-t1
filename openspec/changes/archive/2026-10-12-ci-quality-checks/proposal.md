# Proposal

## Why

Ревью #14 (ilyassakhanov) нашло пробелы в CI и спеках:

- AGENTS.md требует перед коммитом пять проверок, CI гоняет три: `stylelint` и `format:check` в нём нет. Коммит в обход хуков (`--no-verify`) возвращает расхождение незаметно.
- Спеки никто не проверяет: ошибка всплывает только при архиве change. Так в `develop` попали `cabinet-mock-oauth` с требованиями без сценариев и `review-run-diff-viewer`, чей MODIFIED теряет сценарии «Smoke-тест App».
- Setup-блок скопирован в три job'а, а job `syntax` на деле проверяет типы.
- Спека `git-hooks` цитирует скрипт `prepare` без `|| true`, которое появилось ради сборки образа без git.
- Проверка API после деплоя — один запрос: перезапуск API в этот момент роняет деплой интерфейса.

## What Changes

- CI: `stylelint`, `format:check` и `openspec validate --all --strict`; версия openspec закреплена в `devDependencies`.
- Общий setup — composite action `.github/actions/setup`; job `syntax` переименован в `typecheck`.
- `cabinet-mock-oauth`: сценарии у требований «Protected routes» и «Filter available repositories».
- `review-run-diff-viewer`: «Smoke-тест App» удаляется явно (REMOVED), smoke-тест экрана прогона — новым требованием.
- Спека `git-hooks`: требование про `prepare` — через поведение, а не дословный скрипт.
- Проверка API в `deploy.yml` ждёт до минуты, как проверка интерфейса.

## Capabilities

### Modified Capabilities

- `code-quality`: CI выполняет все проверки качества.
- `git-hooks`: установка хуков описана поведением.

## Impact

- `.github/workflows/ci.yml`, `.github/actions/setup/action.yml`, `.github/workflows/deploy.yml`.
- `package.json`, `pnpm-lock.yaml`: `@fission-ai/openspec` и скрипт `spec:validate`.
- Два активных change из `develop` получают правки дельт; поведение кода не меняется.
