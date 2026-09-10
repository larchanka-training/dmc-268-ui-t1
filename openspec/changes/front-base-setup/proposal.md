## Why

Стартовый шаблон Vite + React + TypeScript не содержит единого окружения разработки, стандартов качества кода и автоматических проверок. Проект использует npm без зафиксированной версии Node, не имеет линтинга, форматирования, тестового окружения и git-хуков. Нужно получить воспроизводимый каркас, который можно клонировать и сразу запустить по README без ручной настройки.

## What Changes

- **BREAKING**: Переход с npm на pnpm; `package-lock.json` заменяется на `pnpm-lock.yaml`.
- Обновление стека: Vite 8, React 19, TypeScript 6, Vitest 5, `@vitejs/plugin-react` 6.
- Фиксация Node 22 LTS через `.nvmrc` и `engines` в `package.json`.
- Подключение Tailwind CSS v4 (CSS-first) через `@tailwindcss/vite`.
- Настройка ESLint 10 (flat config, `.mjs` с JSDoc-типизацией), Prettier, Stylelint.
- Настройка Vitest 5 + Testing Library + jsdom + coverage через `@vitest/coverage-v8`.
- Настройка Husky: pre-commit → lint-staged, pre-push → test + check-types + build.
- Типизация конфигурационных файлов: `eslint.config.mjs`, `.prettierrc.mjs`, `stylelint.config.mjs`.
- Расширение `.gitignore`, создание `.env.example`, `.npmrc`.
- Переписывание README под pnpm с описанием всех команд.

## Capabilities

### New Capabilities

- `dependency-management`: Управление зависимостями через pnpm, фиксация версий Node и pnpm
- `build-tooling`: Сборка и dev-сервер на Vite 8 с Tailwind CSS v4 и строгим TypeScript
- `code-quality`: Линтинг и форматирование кода через ESLint, Prettier и Stylelint
- `git-hooks`: Автоматические проверки кода через Husky git hooks
- `testing`: Тестовое окружение на Vitest 5 + Testing Library + jsdom с покрытием кода

### Modified Capabilities

Нет — проект создавался с нуля, существующих спецификаций не было.

## Impact

- **Зависимости**: React 19, Vite 8, TypeScript 6, Vitest 5, ESLint 10, Tailwind CSS 4, Husky 9, lint-staged 17, Stylelint 17, Prettier 3.
- **Файлы**: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/App.test.tsx`, `.gitignore`, `README.md`, конфиги (`.mjs`), `.husky/`, `.npmrc`, `.nvmrc`, `.env.example`, `pnpm-workspace.yaml`.
- **Удалено**: `package-lock.json`, inline-стили в `src/App.tsx`.
- **CI**: Не входит в задачу — добавляется отдельным PR.
