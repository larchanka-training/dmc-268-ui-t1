# testing Specification

## Purpose

Тестовое окружение на Vitest 5 + Testing Library + jsdom с покрытием кода через V8.

## Requirements

### Requirement: Vitest конфигурация

Vitest SHALL быть настроен через секцию `test` в `vite.config.ts`. Конфигурация SHALL использовать `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']`. Покрытие SHALL собираться через `@vitest/coverage-v8` с отчётами `text`, `json`, `html`.

#### Scenario: Запуск тестов (однократный прогон)

- **WHEN** разработчик выполняет `pnpm test`
- **THEN** Vitest выполняет однократный прогон всех тестов
- **AND** команда завершается без зависания (не watch-режим)

#### Scenario: Watch-режим для разработки

- **WHEN** разработчик выполняет `pnpm test:watch`
- **THEN** Vitest запускается в watch-режиме с интерактивным терминалом

#### Scenario: Сбор покрытия

- **WHEN** разработчик выполняет `pnpm test:coverage`
- **THEN** Vitest выполняет тесты с покрытием через V8
- **AND** отчёты сохраняются в `coverage/` в форматах `text`, `json`, `html`

### Requirement: Setup-файл

Файл `src/test/setup.ts` SHALL подключать matchers из `@testing-library/jest-dom/vitest` и выполнять `cleanup()` из `@testing-library/react` после каждого теста.

#### Scenario: Автоматическая очистка после теста

- **WHEN** тест рендерит компонент через `render()`
- **THEN** после завершения теста компонент автоматически размонтируется через `cleanup()`
- **AND** последующие тесты начинают с чистого DOM

### Requirement: TypeScript-типы для тестов

При `globals: true` глобальные функции Vitest (`describe`, `it`, `expect`, `vi` и др.) SHALL быть типизированы через `/// <reference types="vitest/globals" />` в `src/vite-env.d.ts`. Команда `pnpm check-types` SHALL проходить без ошибок типизации на тестовых файлах.

#### Scenario: Проверка типов с vitest globals

- **WHEN** выполняется `pnpm check-types`
- **THEN** глобальные функции Vitest типизированы корректно
- **AND** команда завершается без ошибок

### Requirement: Co-location тестов

Тестовые файлы SHALL располагаться рядом с тестируемым модулем: `Foo.tsx` → `Foo.test.tsx`. Глобальный setup SHALL быть единственным в `src/test/setup.ts`. Фабрики тестовых данных SHALL располагаться в `src/test/factories.ts`.

#### Scenario: Структура тестовых файлов

- **WHEN** проверяется структура `src/`
- **THEN** тест `ReviewRunView.test.tsx` находится рядом с `ReviewRunView.tsx`
- **AND** единственный setup-файл находится в `src/test/setup.ts`

### Requirement: Игнорирование артефактов тестирования

Каталог `coverage/` SHALL быть добавлен в `.gitignore`, `.prettierignore`, исключён из ESLint (`ignores`) и Stylelint (`ignoreFiles`).

#### Scenario: Coverage не коммитится

- **WHEN** выполняется `git status` после `pnpm test:coverage`
- **THEN** каталог `coverage/` не отображается как untracked

### Requirement: Smoke-тест экрана прогона

Интеграционный тест `src/pages/review-run/ui/ReviewRunView.test.tsx` SHALL рендерить экран прогона с фейком `ApiTransport` и проверять её наблюдаемое поведение через `@testing-library/user-event`. Данные SHALL подменяться на уровне `ApiTransport`, а не `fetch`.

#### Scenario: Рендер экрана прогона

- **WHEN** экран прогона рендерится в тесте с фейком `ApiTransport`
- **THEN** заголовок «Прогон ревью» присутствует в документе

#### Scenario: Выбор файла пользователем

- **WHEN** пользователь выбирает другой файл в списке изменённых файлов
- **THEN** показывается дифф выбранного файла
