## Purpose

Линтинг и форматирование кода через ESLint (flat config), Prettier и Stylelint для обеспечения единых стандартов качества.

## ADDED Requirements

### Requirement: ESLint flat config

ESLint SHALL использовать flat config в файле `eslint.config.mjs`. Конфиг SHALL включать: JS-рекомендации, `typescript-eslint.configs.recommended`, правила React Hooks и React Refresh, `eslint-config-prettier` последним набором. Глобальные переменные браузера SHALL быть подключены через `globals.browser`.

#### Scenario: Линтинг всего проекта

- **WHEN** разработчик выполняет `pnpm lint`
- **THEN** ESLint проверяет все файлы проекта
- **AND** команда завершается без ошибок при корректном коде

#### Scenario: Автоисправление

- **WHEN** разработчик выполняет `pnpm lint:fix`
- **THEN** ESLint автоматически исправляет исправимые ошибки

### Requirement: ESLint для тестовых файлов

ESLint SHALL распознавать глобальные тестовые функции (`describe`, `it`, `expect`, `vi` и др.) в файлах `*.test.{ts,tsx}` и `*.spec.{ts,tsx}` без ложных `no-undef` ошибок.

#### Scenario: Линтинг тестового файла с globals

- **WHEN** выполняется `pnpm lint` на файле, использующем глобальные `describe` и `expect`
- **THEN** ESLint не выдаёт ошибок `no-undef` на эти функции

### Requirement: Prettier форматирование

Prettier SHALL быть настроен в `.prettierrc.mjs`: без точек с запятой, одинарные кавычки, `trailingComma: 'all'`, `printWidth: 100`, `endOfLine: 'lf'`. Файл `.prettierignore` SHALL исключать `dist`, `node_modules`, `pnpm-lock.yaml`, `coverage`.

#### Scenario: Форматирование всех файлов

- **WHEN** разработчик выполняет `pnpm format`
- **THEN** Prettier форматирует все файлы проекта согласно конфигурации

#### Scenario: Проверка форматирования

- **WHEN** разработчик выполняет `pnpm format:check`
- **THEN** Prettier проверяет форматирование без записи изменений
- **AND** команда завершается с ошибкой, если найдены неправильно отформатированные файлы

### Requirement: Stylelint для CSS

Stylelint SHALL быть настроен в `stylelint.config.mjs` с `stylelint-config-standard`, адаптированным под синтаксис Tailwind CSS v4. Команда `pnpm stylelint` SHALL проверять `src/**/*.css` без ложных ошибок на Tailwind v4 синтаксис.

#### Scenario: Линтинг Tailwind v4 CSS

- **WHEN** выполняется `pnpm stylelint` на `src/index.css` с `@import 'tailwindcss'`
- **THEN** Stylelint завершается без ошибок

#### Scenario: Автоисправление CSS

- **WHEN** разработчик выполняет `pnpm stylelint:fix`
- **THEN** Stylelint автоматически исправляет исправимые ошибки в CSS-файлах

### Requirement: Игнорирование артефактов

Каталоги `dist`, `node_modules`, `coverage` SHALL быть исключены из ESLint (`ignores`), Stylelint (`ignoreFiles`) и Prettier (`.prettierignore`).

#### Scenario: Проверка игнорирования coverage

- **WHEN** выполняется `pnpm lint` после прогона покрытия
- **THEN** ESLint не проверяет файлы в `coverage/`
