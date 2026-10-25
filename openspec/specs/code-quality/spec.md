# code-quality Specification

## Purpose

Линтинг и форматирование кода через ESLint (flat config), Prettier и Stylelint для обеспечения единых стандартов качества.

## Requirements

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

### Requirement: CI выполняет проверки качества

CI SHALL на каждом пул-реквесте и пуше в `main` и `develop` выполнять проверку типов, ESLint, Stylelint, `prettier --check` по проекту, тесты и `openspec validate --all --strict`. Падение любой проверки SHALL делать прогон CI красным. Версия openspec SHALL быть закреплена в `package.json`.

#### Scenario: Коммит в обход хуков

- **WHEN** в пул-реквест попал файл, отформатированный не по Prettier, закоммиченный с `--no-verify`
- **THEN** CI падает на `format:check`

#### Scenario: Требование без сценария

- **WHEN** в change добавлено требование без `#### Scenario:`
- **THEN** CI падает на проверке спек, не дожидаясь архива change

### Requirement: Даты и числа через Intl

Даты, время и числа SHALL форматироваться через `Intl` и общий форматтер `shared/lib/format.ts`, с одним форматом и одним часовым поясом на всё приложение. Импорт библиотек дат (`dayjs`, `moment`, `date-fns`, `luxon`) SHALL запрещаться правилом ESLint.

#### Scenario: Импорт библиотеки дат

- **WHEN** в файле `src/` появляется `import dayjs from 'dayjs'`
- **THEN** `pnpm lint` падает с подсказкой использовать `formatDateTime` из `@/shared/lib`

#### Scenario: Одно событие на разных экранах

- **WHEN** время одного прогона показано в списке и на экране прогона
- **THEN** оба экрана выводят его в одном формате и одном поясе
