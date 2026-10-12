# Spec Delta

## MODIFIED Requirements

### Requirement: Git hooks через core.hooksPath

Git hooks SHALL быть настроены через `core.hooksPath`, указывающий на каталог `.githooks/`. Скрипт `prepare` в `package.json` SHALL настраивать `core.hooksPath` после `pnpm install` в git-репозитории и SHALL NOT ронять установку там, где git-репозитория нет, например при сборке Docker-образа. Каталог `.githooks/` SHALL содержать хуки `pre-commit` и `pre-push`. Файлы хуков SHALL иметь исполняемый бит (+x), установленный через `git update-index --chmod=+x`.

#### Scenario: Установка хуков после pnpm install

- **WHEN** разработчик выполняет `pnpm install` в свежем клоне
- **THEN** скрипт `prepare` выполняет `git config core.hooksPath .githooks`
- **AND** git использует хуки из `.githooks/` вместо `.git/hooks/`

#### Scenario: Установка без git-репозитория

- **WHEN** `pnpm install` выполняется в каталоге без git, например при сборке образа
- **THEN** установка завершается успешно, хуки не настраиваются
