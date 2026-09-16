## Purpose

Автоматические проверки кода через нативные git hooks (core.hooksPath): pre-commit линтит staged-файлы, pre-push запускает полный набор проверок.

## ADDED Requirements

### Requirement: Git hooks через core.hooksPath

Git hooks SHALL быть настроены через `core.hooksPath`, указывающий на каталог `.githooks/`. Скрипт `"prepare": "git config core.hooksPath .githooks"` в `package.json` SHALL обеспечивать настройку хуков после `pnpm install`. Каталог `.githooks/` SHALL содержать хуки `pre-commit` и `pre-push`. Файлы хуков SHALL иметь исполняемый бит (+x), установленный через `git update-index --chmod=+x`.

#### Scenario: Установка хуков после pnpm install

- **WHEN** разработчик выполняет `pnpm install` в свежем клоне
- **THEN** скрипт `prepare` выполняет `git config core.hooksPath .githooks`
- **AND** git использует хуки из `.githooks/` вместо `.git/hooks/`

### Requirement: pre-commit хук — lint-staged

Хук `.githooks/pre-commit` SHALL запускать `pnpm exec lint-staged`. lint-staged SHALL применять ESLint `--fix` + Prettier `--write` к `*.{ts,tsx,js,jsx}`, Stylelint `--fix` + Prettier `--write` к `*.css`, Prettier `--write` к `*.{json,md,html}`. Хук SHALL проверять только staged-файлы, а не весь проект.

#### Scenario: Коммит с линтингом staged-файлов

- **WHEN** разработчик выполняет `git commit` с изменёнными `.ts` и `.css` файлами
- **THEN** lint-staged применяет ESLint `--fix` и Prettier `--write` к `.ts` файлам
- **AND** lint-staged применяет Stylelint `--fix` и Prettier `--write` к `.css` файлам
- **AND** исправленные файлы переносятся в staging

#### Scenario: Блокировка коммита при ошибках линтинга

- **WHEN** в staged-файле есть неисправимая ошибка ESLint
- **THEN** pre-commit хук прерывается с ошибкой
- **AND** коммит не создаётся

### Requirement: pre-push хук — полные проверки

Хук `.githooks/pre-push` SHALL запускать `pnpm test && pnpm check-types && pnpm build`. Хук SHALL блокировать push при падении любой из проверок.

#### Scenario: Успешный push

- **WHEN** тесты проходят, типы корректны, сборка успешна
- **THEN** pre-push хук завершается успешно
- **AND** push выполняется

#### Scenario: Блокировка push при падении тестов

- **WHEN** хотя бы один тест падает
- **THEN** pre-push хук прерывается на этапе `pnpm test`
- **AND** push не выполняется

### Requirement: Обход хуков

Разработчик SHALL иметь возможность обойти git-хуки через флаг `--no-verify` для `git commit` и `git push`.

#### Scenario: Коммит без проверок

- **WHEN** разработчик выполняет `git commit --no-verify -m "wip"`
- **THEN** pre-commit хук не запускается
- **AND** коммит создаётся
