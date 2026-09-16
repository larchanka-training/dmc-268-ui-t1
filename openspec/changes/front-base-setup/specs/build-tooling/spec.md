## Purpose

Сборка и dev-сервер на Vite 8 с интеграцией Tailwind CSS v4 и строгим TypeScript.

## ADDED Requirements

### Requirement: Dev-сервер Vite

Команда `pnpm dev` SHALL запускать Vite dev-сервер на порту 3000 с автоматическим открытием браузера.

#### Scenario: Запуск dev-сервера

- **WHEN** разработчик выполняет `pnpm dev`
- **THEN** dev-сервер запускается на `http://localhost:3000`
- **AND** браузер автоматически открывает вкладку с приложением

### Requirement: Production-сборка с проверкой типов

Команда `pnpm build` SHALL выполнять `tsc && vite build` — проверку типов TypeScript и production-сборку.

#### Scenario: Успешная сборка

- **WHEN** в коде нет ошибок типов
- **THEN** `pnpm build` завершается успешно
- **AND** в каталоге `dist/` появляются собранные артефакты

#### Scenario: Ошибка типов блокирует сборку

- **WHEN** в коде есть ошибка типов TypeScript
- **THEN** `pnpm build` прерывается на этапе `tsc` с сообщением об ошибке
- **AND** production-сборка не выполняется

### Requirement: Отдельная команда проверки типов

Команда `pnpm check-types` SHALL выполнять `tsc --noEmit` без генерации файлов. Алиас `pnpm typecheck` SHALL указывать на ту же команду для совместимости с CI.

#### Scenario: Проверка типов без сборки

- **WHEN** разработчик выполняет `pnpm check-types`
- **THEN** TypeScript проверяет типы без emit
- **AND** команда завершается без ошибок при корректном коде

### Requirement: Tailwind CSS v4 интеграция

Tailwind CSS v4 SHALL быть подключён через `@tailwindcss/vite` (CSS-first, без `tailwind.config.js`). Плагин SHALL быть подключён до `react()` в `vite.config.ts`. Файл `src/index.css` SHALL содержать `@import 'tailwindcss'`. Стили SHALL импортироваться в `src/main.tsx`.

#### Scenario: Tailwind-стили попадают в сборку

- **WHEN** выполняется `pnpm build`
- **THEN** CSS-файл сборки содержит Tailwind-утилиты
- **AND** классы Tailwind в `src/App.tsx` применяются корректно

#### Scenario: Отсутствие tailwind.config.js

- **WHEN** проверяется корень проекта
- **THEN** файл `tailwind.config.js` отсутствует (v4 — CSS-first)

### Requirement: Строгий TypeScript

Конфигурация `tsconfig.json` SHALL иметь `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`. Типы Vite и Vitest SHALL быть доступны через `src/vite-env.d.ts`.

#### Scenario: Типизация import.meta.env

- **WHEN** в коде используется `import.meta.env`
- **THEN** TypeScript корректно разрешает типы из `vite/client`

#### Scenario: Типизация vitest globals

- **WHEN** в тестовом файле используются глобальные `describe`, `it`, `expect`, `vi` без импорта
- **THEN** TypeScript корректно типизирует их через `/// <reference types="vitest/globals" />`

### Requirement: Типизация конфигурационных файлов

Конфиги ESLint, Prettier и Stylelint SHALL использовать `.mjs` расширение с JSDoc-аннотацией `@type`.

#### Scenario: Типизация eslint.config.mjs

- **WHEN** открывается `eslint.config.mjs`
- **THEN** файл содержит `/** @type {import('eslint').Linter.Config[]} */` перед export

#### Scenario: Типизация .prettierrc.mjs

- **WHEN** открывается `.prettierrc.mjs`
- **THEN** файл содержит `/** @type {import('prettier').Config} */` перед export

#### Scenario: Типизация stylelint.config.mjs

- **WHEN** открывается `stylelint.config.mjs`
- **THEN** файл содержит `/** @type {import('stylelint').Config} */` перед export
