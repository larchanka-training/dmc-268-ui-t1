## Context

Стартовый шаблон Vite + React + TypeScript не имел единого окружения разработки. Проект использовал npm без зафиксированных версий, не имел линтинга, форматирования, тестового окружения и git-хуков. Требовалось создать воспроизводимый каркас, который можно клонировать и сразу запустить.

## Goals / Non-Goals

**Goals:**

- Воспроизводимое окружение через фиксацию Node 22 LTS и pnpm
- Единый стандарт качества кода: ESLint, Prettier, Stylelint
- Тестовое окружение: Vitest 5 + Testing Library + jsdom + coverage
- Автоматические проверки через Husky git hooks
- Актуальный стек: Vite 8, React 19, TypeScript 6

**Non-Goals:**

- CI-конфигурация (отдельная задача)
- Бизнес-функционал (только каркас и тулинг)
- FSD/архитектурная структура (плоская структура `src/` достаточна)
- Содержательные unit/integration-тесты бизнес-логики (достаточно smoke-теста)

## Decisions

### pnpm вместо npm

DoD явно содержит `pnpm ...`. pnpm обеспечивает детерминированную установку, быстрый кэш, строгую изоляцию зависимостей. Версия зафиксирована через `packageManager` и `engines`.

### Tailwind CSS v4 (CSS-first)

Tailwind v4 использует CSS-first подход: конфигурация через CSS, без `tailwind.config.js`. Подключение через `@tailwindcss/vite` плагин, стили через `@import 'tailwindcss'` в `index.css`. Это упрощает конфигурацию и убирает необходимость в `postcss.config.js`.

### ESLint 10 flat config + .mjs

ESLint 10 использует flat config по умолчанию. Конфиг в `.mjs` с JSDoc `@type` для типизации. `eslint-plugin-vitest` убран — несовместим с ESLint 10 (макс. ESLint 9). Тестовые globals прописаны вручную в конфиге.

### Vitest 5 через секцию test в vite.config.ts

Единый конфиг Vite + Vitest без дублирования. `globals: true` для ergonomic использования `describe`/`it`/`expect` без импорта. Покрытие через `@vitest/coverage-v8`.

### `test` → `vitest run`, `test:watch` → `vitest`

Скрипт `test` выполняет однократный прогон (`vitest run`), а не watch-режим. Это предотвращает зависание в CI и Docker. Watch-режим вынесен в `test:watch`.

### `build` включает `tsc &&`

Скрипт `build` выполняет `tsc && vite build` — проверка типов перед сборкой. Это гарантирует, что CI и Docker получают типизированную сборку даже при обходе pre-push хука через `--no-verify`.

### Алиас `typecheck` для CI

Добавлен алиас `"typecheck": "tsc --noEmit"` рядом с `check-types` для совместимости с CI из PR #1, который вызывает `pnpm run typecheck`.

### `onlyBuiltDependencies` вместо `allowBuilds`

Ключ `allowBuilds` невалиден в pnpm. Использован валидный `onlyBuiltDependencies` для разрешения сборки esbuild.

## Risks / Trade-offs

### eslint-plugin-vitest удалён

Плагин `eslint-plugin-vitest@0.5.4` поддерживает максимум ESLint 9 и несовместим с ESLint 10. Тестовые globals прописаны вручную в `languageOptions.globals` — это покрывает `no-undef`, но не даёт специализированных правил Vitest. Альтернатива: дождаться обновления плагина или даунгрейд ESLint до 9.

### Конфликт pnpm версий с PR #1

PR #1 использует `pnpm@10.17.1`, этот PR — `pnpm@12.3.4`. Разный `lockfileVersion` потребует регенерации lock-файла при мерже. Решение: мержить PR #4 первым, PR #1 перебазировать поверх.

### Husky vs нативные git hooks

Ревьюер предложил использовать нативные git hooks вместо Husky. Владелец проекта решил оставить Husky — обсуждение недостатков нативных хуков отложено на синк. Риск: Husky добавляет зависимость, но обеспечивает кроссплатформенную установку хуков через `prepare` скрипт.
