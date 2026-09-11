## 1. Управление зависимостями

- [x] 1.1 Удалить `package-lock.json`, перевести проект на pnpm
- [x] 1.2 Создать `.npmrc` с `auto-install-peers=true` и `engine-strict=true`
- [x] 1.3 Зафиксировать версию pnpm в `packageManager` и `engines.pnpm`
- [x] 1.4 Создать `.nvmrc` с версией Node 22
- [x] 1.5 Зафиксировать Node 22 в `engines.node`
- [x] 1.6 Настроить `pnpm-workspace.yaml` с `onlyBuiltDependencies` для esbuild

## 2. Сборка и dev-сервер

- [x] 2.1 Обновить Vite до 8, React до 19, TypeScript до 6
- [x] 2.2 Подключить Tailwind CSS v4 через `@tailwindcss/vite` (до `react()`)
- [x] 2.3 Создать `src/index.css` с `@import 'tailwindcss'`
- [x] 2.4 Импортировать стили в `src/main.tsx`
- [x] 2.5 Настроить dev-сервер на порт 3000 с автооткрытием браузера
- [x] 2.6 Настроить `build`: `tsc && vite build`
- [x] 2.7 Добавить `check-types` и алиас `typecheck`
- [x] 2.8 Обеспечить `src/vite-env.d.ts` с типами Vite и Vitest
- [x] 2.9 Типизировать конфиги: `eslint.config.mjs`, `.prettierrc.mjs`, `stylelint.config.mjs`

## 3. Качество кода

- [x] 3.1 Настроить ESLint 10 (flat config) с typescript-eslint, react-hooks, react-refresh
- [x] 3.2 Подключить `eslint-config-prettier` последним набором
- [x] 3.3 Настроить globals.browser и тестовые globals
- [x] 3.4 Настроить Prettier в `.prettierrc.mjs` (без semicolons, single quotes)
- [x] 3.5 Создать `.prettierignore`
- [x] 3.6 Настроить Stylelint с `stylelint-config-standard`, адаптированным под Tailwind v4
- [x] 3.7 Исключить `dist`, `node_modules`, `coverage` из всех линтеров

## 4. Git hooks

- [x] 4.1 Настроить нативные git hooks через `core.hooksPath` (без Husky)
- [x] 4.2 Добавить скрипт `"prepare": "git config core.hooksPath .githooks"` в `package.json`
- [x] 4.3 Настроить `pre-commit` → `pnpm exec lint-staged`
- [x] 4.4 Настроить `pre-push` → `pnpm test && pnpm check-types && pnpm build`
- [x] 4.5 Настроить секцию `lint-staged` в `package.json`
- [x] 4.6 Выставить исполняемый бит на `.githooks/*` через `git update-index --chmod=+x`

## 5. Тестовое окружение

- [x] 5.1 Установить Vitest 5, @vitest/coverage-v8, Testing Library, jsdom
- [x] 5.2 Настроить секцию `test` в `vite.config.ts` (jsdom, globals, setupFiles)
- [x] 5.3 Создать `src/test/setup.ts` (jest-dom matchers + cleanup)
- [x] 5.4 Создать smoke-тест `src/App.test.tsx` (рендер + взаимодействие)
- [x] 5.5 Настроить скрипты: `test` (run), `test:watch`, `test:coverage`
- [x] 5.6 Добавить покрытие через V8 с отчётами text/json/html
- [x] 5.7 Исключить артефакты тестирования из git, lint, prettier

## 6. Базовые файлы

- [x] 6.1 Расширить `.gitignore` (coverage, .env.*, .DS_Store, .idea/)
- [x] 6.2 Создать `.env.example` с комментарием-заглушкой
- [x] 6.3 Переписать `README.md` под pnpm с описанием всех команд
- [x] 6.4 Адаптировать `src/App.tsx` — Tailwind-классы вместо inline-стилей

## 7. Проверка

- [x] 7.1 `pnpm check-types` — без ошибок
- [x] 7.2 `pnpm lint` — без ошибок
- [x] 7.3 `pnpm stylelint` — без ошибок
- [x] 7.4 `pnpm format:check` — без ошибок
- [x] 7.5 `pnpm test` — тесты проходят
- [x] 7.6 `pnpm build` — сборка успешна
