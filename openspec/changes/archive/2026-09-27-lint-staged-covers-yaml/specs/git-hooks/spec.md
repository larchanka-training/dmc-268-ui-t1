# Spec Delta

## MODIFIED Requirements

### Requirement: pre-commit хук — lint-staged

Хук `.githooks/pre-commit` SHALL запускать `pnpm exec lint-staged`. lint-staged SHALL применять ESLint `--fix` + Prettier `--write` к `*.{ts,tsx,js,jsx}`, Stylelint `--fix` + Prettier `--write` к `*.css`, Prettier `--write` к `*.{json,md,html}` и к `*.{yml,yaml}`. Хук SHALL проверять только staged-файлы, а не весь проект.

Набор расширений, которые обрабатывает lint-staged, SHALL покрывать всё, что проверяет `prettier --check` по проекту: иначе `format:check` расходится с тем, что форматируется автоматически, и перестаёт проходить.

#### Scenario: Коммит с линтингом staged-файлов

- **WHEN** разработчик выполняет `git commit` с изменёнными `.ts` и `.css` файлами
- **THEN** lint-staged применяет ESLint `--fix` и Prettier `--write` к `.ts` файлам
- **AND** lint-staged применяет Stylelint `--fix` и Prettier `--write` к `.css` файлам
- **AND** исправленные файлы переносятся в staging

#### Scenario: Блокировка коммита при ошибках линтинга

- **WHEN** в staged-файле есть неисправимая ошибка ESLint
- **THEN** pre-commit хук прерывается с ошибкой
- **AND** коммит не создаётся

#### Scenario: Коммит файла конфигурации workflow

- **WHEN** в коммит попадает файл `.yml` или `.yaml`
- **THEN** он форматируется так же, как остальные, и не создаёт расхождения с `format:check`
