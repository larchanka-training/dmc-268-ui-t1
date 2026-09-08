# Спецификация: базовый проектный каркас фронтенда и тулинг (DMC-268 UI Team 1)

> Документ — ТЗ для агента-исполнителя. Агент должен выполнить работы строго в рамках описанного ниже, сверяясь с Definition of Done в конце.

## 1. Контекст и цель

Подготовить базовый фронтенд-проект на **Vite + React + TypeScript** с единым окружением разработки, стандартами качества кода и автоматическими проверками (ESLint, Prettier, Stylelint, Husky).

Цель — получить воспроизводимый каркас, который можно клонировать и сразу запустить по README без ручной настройки, и в котором git-хуки + команды гарантируют чистоту кода и успешную сборку.

## 2. Текущее состояние репозитория

Репозиторий уже содержит минимальный стартовый шаблон (`Initial commit: Vite React TypeScript setup`):

- `package.json` — Vite 5 + React 18 + TS 5.2, скрипты только `dev`/`build`/`preview`, package manager — **npm** (присутствует `package-lock.json`, в git не закоммичен).
- `tsconfig.json` — уже **строгий** (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`), `moduleResolution: bundler`, `noEmit: true`. База хорошая, остаётся.
- `vite.config.ts` — только `@vitejs/plugin-react`.
- `index.html` — стандартный, ссылается на `/src/main.tsx`.
- `src/App.tsx` — компонент-счётчик со inline-стилями.
- `src/main.tsx` — точка входа, `React.StrictMode`.
- `.gitignore` — минимальный: `node_modules/`, `dist/`, `.env`, `.env.local`, `*.log`.
- `README.md` — 3 строки, инструкция под npm.
- Неотслеживаемые: `.idea/`, `package-lock.json`.
- CI-конфигурации нет (`.github` отсутствует).
- Локально установлен Node 26.7.0 (current), npm 11.19.0, pnpm отсутствует.

## 3. Принятые решения (согласованы с владельцем)

| Развилка           | Решение                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager    | **pnpm** (DoD явно содержит `pnpm ...`). Перейти с npm: удалить `package-lock.json`, сгенерировать `pnpm-lock.yaml`, добавить `.npmrc`.     |
| Версия Node.js     | **Node 22 (LTS)**. Зафиксировать в `.nvmrc` и в `engines` `package.json`.                                                                   |
| Стек стилей        | **Tailwind CSS v4** (CSS-first, через `@tailwindcss/vite`). Stylelint настроить под Tailwind v4.                                            |
| CI                 | **Не создаётся в этой задаче** (CI добавляется отдельной задачей позже). Пункт «при наличии CI» пропускается согласно формулировке задания. |
| Конфиг ESLint      | **Flat config** (`eslint.config.js`), ESLint 10 — flat config по умолчанию.                                                                 |
| Форматирование     | Prettier; стиль без точек с запятой и с одинарными кавычками (как в существующем коде).                                                     |
| Тестовый фреймворк | **Vitest 5** + **@testing-library/react** + **@testing-library/jest-dom** + **jsdom** + coverage через `@vitest/coverage-v8`.               |

## 4. Область работ

### Входит

1. Перевод проекта с npm на pnpm.
2. Фиксация версии Node 22 LTS (`.nvmrc`, `engines`).
3. Настройка Tailwind CSS v4 + интеграция в приложение.
4. Настройка строгого TypeScript (проверить существующий `tsconfig.json`, при необходимости усилить).
5. Настройка ESLint (flat config) + Prettier + Stylelint.
6. Настройка Husky: pre-commit → lint-staged, pre-push → check-types + build.
7. Расширение набора скриптов `package.json`.
8. Базовые файлы: `.gitignore` (расширить), `.editorconfig`, `.env.example`, `.npmrc`, `.nvmrc`.
9. Расширение `README.md` инструкцией под pnpm и описанием всех команд.
10. Очистить стандартный Vite boilerplate и минимально адаптировать `src/App.tsx` для демонстрации работы Tailwind.
11. Настройка тестового окружения: Vitest + Testing Library + jsdom, конфигурация, setup-файл, smoke-тест на `App.tsx`, скрипты и покрытие.

### Не входит

- CI-конфигурация (отдельная задача).
- Реализация бизнес-функционала — только каркас и тулинг.
- Сложная FSD/архитектурная структура — текущая плоская структура `src/` достаточна.
- Написание содержательных unit/integration-тестов бизнес-логики — достаточно одного smoke-теста, подтверждающего работоспособность тестового окружения.

## 5. Технические требования

### 5.1. Перевод на pnpm

- Удалить `package-lock.json`; в репозитории должен использоваться только `pnpm-lock.yaml`.
- Выполнить установку зависимостей через зафиксированную версию pnpm → создаётся `pnpm-lock.yaml`.
- Создать `.npmrc` в корне:
  ```ini
  auto-install-peers=true
  strict-peer-dependencies=false
  engine-strict=true
  ```
- Выбрать конкретную версию pnpm, совместимую с Node 22, и зафиксировать её в `package.json` через `packageManager` и `engines`. Одна и та же версия должна использоваться при установке зависимостей.
- В `package.json` добавить `engines`:
  ```json
  "engines": {
    "node": ">=22 <23",
    "pnpm": "<та же зафиксированная версия>"
  }
  ```

### 5.2. Фиксация версии Node

- Создать `.nvmrc` в корне:
  ```text
  22
  ```
  (использовать мажор `22` — nvm/fnm выберут последний LTS 22.x).

### 5.3. TypeScript

Существующий `tsconfig.json` уже строгий. Дополнительно:

- Оставить `strict: true` и текущие `noUnused*`/`noFallthroughCasesInSwitch`.
- Убедиться, что `tsc --noEmit` отрабатывает без ошибок (команда `check-types`).
- При наличии причин — вынести `vite-env.d.ts` (`/// <reference types="vite/client" />`) если отсутствует, чтобы типы Vite-импортов (`import.meta.env` и т.п.) разрешались.
- Скрипт `build` должен выполнять production-сборку. Проверка типов выполняется отдельной командой `check-types`; не дублировать её в `build`.

### 5.4. Tailwind CSS v4

Tailwind v4 меняет подход к интеграции (CSS-first, без `tailwind.config.js` по умолчанию, без `postcss.config.js`/`autoprefixer`):

- Установить пакеты: `tailwindcss @tailwindcss/vite`.
- В `vite.config.ts` подключить плагин **до** `react()`:
  ```ts
  import { defineConfig } from 'vite'
  import tailwindcss from '@tailwindcss/vite'
  import react from '@vitejs/plugin-react'

  export default defineConfig({
    plugins: [tailwindcss(), react()],
  })
  ```
- Создать `src/index.css` с одной строкой:
  ```css
  @import 'tailwindcss';
  ```
- Импортировать стили в `src/main.tsx`: `import './index.css'` (перед рендером).
- Опционально (рекомендуется) — перевести `src/App.tsx` с inline-стилей на классы Tailwind для демонстрации работы (не критично для DoD, но подтверждает сборку с Tailwind).
- `tailwind.config.js` **не создавать** (v4 — CSS-first). Кастомизация темы при необходимости через `@theme` в `index.css` — но в рамках задачи кастомизация не требуется.

### 5.5. ESLint (flat config)

- Установить: `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, `globals`, `eslint-plugin-vitest`.
- Создать `eslint.config.js` (flat config). Включить:
  - `ignores`: `dist`, `node_modules`, `coverage`. Конфигурационные файлы проекта также проходят ESLint.
  - Базовый набор JS-рекомендаций (`js.configs.recommended` из `typescript-eslint`).
  - `typescript-eslint.configs.recommended` (или `recommendedTypeChecked` при желании — **рекомендуется `recommended`** чтобы не требовать `parserOptions.project` и не замедлять lint; type-checked — по желанию, если добавляется, то обеспечить корректную настройку `project`).
  - Конфиг для React: `eslint-plugin-react-hooks` (правила `rules-of-hooks`, `exhaustive-deps`) и `eslint-plugin-react-refresh` (правило `react-refresh/only-export-components`).
  - `eslint-config-prettier` — последним набором для отключения конфликтующих форматных правил.
  - `languageOptions.globals` — подключить `globals.browser` (и при необходимости `globals.node` для конфиг-файлов).
- Отдельный конфиг-набор для тестовых файлов (`**/*.{test,spec}.{ts,tsx}`) — подключить рекомендуемую конфигурацию `eslint-plugin-vitest`, чтобы глобальные функции Vitest (`describe`, `it`, `expect`, `vi` и т.д.) и правила для тестов распознавались корректно. См. п. 5.12.5.
- Скрипт `lint`: `eslint .`. Опционально `--max-warnings 0` — на усмотрение, но рекомендуется для строгости.
- Скрипт `lint:fix`: `eslint . --fix`.

### 5.6. Prettier

- Установить: `prettier`.
- Создать `.prettierrc.json`:
  ```json
  {
    "semi": false,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2,
    "arrowParens": "always",
    "endOfLine": "lf"
  }
  ```
  (стиль согласован с существующим кодом: без точек с запятой, одинарные кавычки).
- Создать `.prettierignore`:
  ```text
  dist
  node_modules
  pnpm-lock.yaml
  coverage
  ```
- Скрипты:
  - `format`: `prettier --write .`
  - `format:check`: `prettier --check .`

### 5.7. Stylelint

- Установить `stylelint` и совместимую с Tailwind CSS v4 конфигурацию. Не использовать конфигурации, предназначенные только для Tailwind v3, если они вызывают ошибки или предупреждения на синтаксисе Tailwind v4.
  - Агент обязан проверить, что `pnpm stylelint` отрабатывает на `src/index.css` без ложных ошибок. Итоговый выбор совместимой конфигурации — за исполнителем, критерий: `pnpm stylelint` зелёный на существующих стилях.
- Создать `stylelint.config.js` (или `.stylelintrc.json`).
  ```js
  export default {
    extends: ['stylelint-config-standard'],
    ignoreFiles: ['dist/**', 'node_modules/**', 'pnpm-lock.yaml', 'coverage/**'],
  }
  ```
  Конфигурацию адаптировать под синтаксис Tailwind CSS v4; приведённый набор правил является базовым ориентиром, а не требованием использовать его без изменений.
- Создать `.stylelintignore` при необходимости.
- Скрипт `stylelint`: `stylelint "src/**/*.{css}"` (и `--fix` в `stylelint:fix` при желании).

### 5.8. Husky + lint-staged

- Установить: `husky`, `lint-staged` (devDependencies).
- Инициализировать Husky: `pnpm exec husky init` (создаст `.husky/` и хук `pre-commit`).
- Настроить два хука:

  **`.husky/pre-commit`** — запуск lint-staged:

  ```sh
  pnpm exec lint-staged
  ```

  **`.husky/pre-push`** — проверки типов, тестов и сборки:

  ```sh
  pnpm test:run && pnpm check-types && pnpm build
  ```

- В `package.json` добавить секцию `lint-staged`:
  ```json
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{css}": ["stylelint --fix", "prettier --write"],
    "*.{json,md,html}": ["prettier --write"]
  }
  ```
  (исключить `pnpm-lock.yaml` — он в `.prettierignore`).
- Добавить скрипт `"prepare": "husky"` в `package.json` (чтобы хуки ставились после `pnpm install`).

### 5.9. Базовые файлы

**`.gitignore`** — расширить существующий:

```gitignore
# Dependencies
node_modules/

# Build output
dist/
coverage/

# Env
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Editor / OS
.idea/
.vscode/*
!.vscode/extensions.json
.DS_Store
*.local
```

**`.editorconfig`**:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
max_line_length = 100

[*.md]
trim_trailing_whitespace = false
```

**`.env.example`** — обязательный шаблон для environment variables проекта. На текущем этапе не добавлять выдуманные переменные: файл может содержать только комментарий-заглушку до появления реальных переменных.

**`.npmrc`** — см. п. 5.1.

**`.nvmrc`** — см. п. 5.2.

### 5.10. `package.json` — итоговый набор скриптов

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check-types": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "stylelint": "stylelint \"src/**/*.css\"",
    "stylelint:fix": "stylelint \"src/**/*.css\" --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "prepare": "husky"
  }
}
```

### 5.11. README.md

Переписать под pnpm и описать все команды. Минимальное содержание:

- Заголовок и краткое описание.
- **Требования**: Node 22 LTS и зафиксированная версия pnpm; описать способ установки именно этой версии.
- **Быстрый старт**: `pnpm install` → `pnpm dev`.
- **Скрипты** — таблица со всеми командами (`dev`, `build`, `preview`, `check-types`, `lint`, `lint:fix`, `stylelint`, `stylelint:fix`, `format`, `format:check`, `test`, `test:run`, `test:coverage`) с описанием.
- **Git hooks** — описание того, что `pre-commit` проверяет только изменённые/staged-файлы через lint-staged, а `pre-push` выполняет полные проверки (`test:run`, `check-types`, `build`), и как их обойти при необходимости (`--no-verify`).
- **Тестирование** — как запустить тесты (`pnpm test` — watch, `pnpm test:run` — разовый прогон, `pnpm test:coverage` — с покрытием), где лежат тесты и setup.
- **Структура проекта** — кратко.
- **Окружение** — про `.env.example` и правила работы с локальными `.env`-файлами.
- **Технологии** — Vite, React, TypeScript, Tailwind CSS, Vitest + Testing Library, ESLint, Prettier, Stylelint, Husky.

### 5.12. Тестовое окружение (Vitest + Testing Library)

Каркас должен включать готовое к работе тестовое окружение: runner, DOM-среду, matchers, setup, smoke-тест и скрипты.

#### 5.12.1. Пакеты

Установить как devDependencies:

```bash
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- **`vitest`** — test runner (нативная интеграция с Vite, ESM, быстрый HMR).
- **`@vitest/coverage-v8`** — сбор покрытия кода через V8.
- **`@testing-library/react`** — рендер и тестирование React-компонентов.
- **`@testing-library/jest-dom`** — кастомные DOM-матчеры (`toBeInTheDocument`, `toHaveTextContent` и т.п.).
- **`@testing-library/user-event`** — симуляция пользовательских действий.
- **`jsdom`** — реализация DOM-среды для тестов.

#### 5.12.2. Конфигурация

Вариант: расширить `vite.config.ts` секцией `test` (рекомендуемый подход Vitest для небольших проектов — единый конфиг, без дублирования). В начале файла добавить reference-директиву:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/test/setup.ts',
        'src/main.tsx',
        '**/*.config.{ts,js}',
        'coverage/',
      ],
    },
  },
})
```

Ключевые параметры:

- `environment: 'jsdom'` — DOM-среда для тестов компонентов.
- `globals: true` — `describe`/`it`/`expect` доступны глобально без импорта (ergonomic).
- `setupFiles: ['./src/test/setup.ts']` — setup, выполняемый перед тестами.
- `include` — стандартные паттерны имён тестов (`*.test.ts(x)`, `*.spec.ts(x)`).
- `coverage` — V8-провайдер, отчёты text/json/html; `exclude` убирает из отчёта точку входа, конфиги и setup.

#### 5.12.3. Setup-файл `src/test/setup.ts`

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
```

- Подключает кастомные matchers из `@testing-library/jest-dom`.
- Автоматически размонтирует компоненты после каждого теста (cleanup), чтобы тесты не влияли друг на друга.

#### 5.12.4. TypeScript-типы для тестов

При `globals: true` в Vitest глобальные функции (`describe`, `it`, `expect`, `vi` и т.д.) должны быть типизированы. В `src/vite-env.d.ts` (который создаётся по п. 5.3) добавить reference:

```ts
/// <reference types="vite/client" />
/// <reference types="vitest/globals" />
```

Либо, если `vite-env.d.ts` не создаётся, добавить reference в `src/test/setup.ts`. Альтернатива — создать отдельный `src/vitest.d.ts` с reference на `vitest/globals`.

Агент обязан убедиться, что `pnpm check-types` проходит без ошибок при `globals: true` (глобальные функции типизированы).

#### 5.12.5. ESLint для тестовых файлов

В flat config ESLint обеспечить, чтобы тестовые файлы проходили линтинг без ложных ошибок на глобальные тестовые функции:

- При `globals: true` — добавить в `languageOptions.globals` для тестовых файлов (`*.test.{ts,tsx}`, `*.spec.{ts,tsx}`) объект `vitest/globals` (через `globals`-пакет или `eslint-plugin-vitest`).
- Установить `eslint-plugin-vitest` и подключить его рекомендуемую конфигурацию для тестовых файлов, чтобы тестовые globals и базовые правила Vitest распознавались корректно.
- Агент обязан убедиться, что `pnpm lint` проходит на тестовых файлах без ложных `no-undef` / `@typescript-eslint/no-unused-vars` на глобальные функции.

#### 5.12.6. Smoke-тест `src/App.test.tsx`

Создать минимальный smoke-тест, подтверждающий работоспособность окружения (рендер компонента, поиск по тексту, проверка взаимодействия):

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

describe('App', () => {
  it('renders the title', () => {
    render(<App />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('increments the counter on click', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Count is 0')
    await user.click(button)
    expect(button).toHaveTextContent('Count is 1')
  })
})
```

Тест должен быть адаптирован под фактическую разметку `App.tsx` после его изменения (Tailwind-классы). Критерий: `pnpm test:run` завершается успешно.

#### 5.12.7. Структура тестовых файлов

```
src/
  test/
    setup.ts          # глобальный setup (jest-dom matchers + cleanup)
  App.test.tsx        # smoke-тест на App
```

- Тесты колокируются рядом с тестируемым модулем (co-location): `Foo.tsx` → `Foo.test.tsx`.
- Глобальный setup — единственный, в `src/test/setup.ts`.

#### 5.12.8. Скрипты для тестов

Добавить в `package.json` (см. п. 5.10):

| Скрипт          | Команда                 | Назначение                             |
| --------------- | ----------------------- | -------------------------------------- |
| `test`          | `vitest`                | Запуск в watch-режиме (разработка).    |
| `test:run`      | `vitest run`            | Однократный прогон (CI, pre-push).     |
| `test:coverage` | `vitest run --coverage` | Однократный прогон со сбором покрытия. |

#### 5.12.9. Игнорирование артефактов

- `coverage/` — добавить в `.gitignore` (см. п. 5.9, уже включено) и `.prettierignore` (уже включено).
- Убедиться, что `coverage/` также исключён из ESLint (`ignores`) и Stylelint (`ignoreFiles`).

## 6. Итоговый список файлов

### Создать

- `.nvmrc`
- `.npmrc`
- `.editorconfig`
- `.env.example`
- `eslint.config.js`
- `.prettierrc.json`
- `.prettierignore`
- `stylelint.config.js`
- `.husky/pre-commit`
- `.husky/pre-push`
- `src/index.css`
- `src/vite-env.d.ts` (если отсутствует) — включая `/// <reference types="vitest/globals" />`
- `src/test/setup.ts`
- `src/App.test.tsx`

### Изменить

- `package.json` (скрипты, `engines`, `packageManager`, `lint-staged`, devDependencies)
- `vite.config.ts` (плагин Tailwind + секция `test` для Vitest)
- `src/main.tsx` (импорт `index.css`)
- `src/App.tsx` (опционально — Tailwind-классы вместо inline-стилей)
- `.gitignore` (расширить)
- `README.md` (переписать)
- `tsconfig.json` (только при необходимости усилить/поправить; обеспечить типизацию vitest globals)

### Удалить

- `package-lock.json` (заменяется на `pnpm-lock.yaml`)

## 7. Команды установки зависимостей (для агента)

Выполнять через pnpm. Версии новых зависимостей должны быть совместимы с зафиксированным стеком и фиксироваться через `pnpm-lock.yaml`; существующие зависимости не обновлять без необходимости.

```bash
# Перевод на pnpm
rm -f package-lock.json
pnpm install

# Tailwind v4
pnpm add -D tailwindcss @tailwindcss/vite

# ESLint stack
pnpm add -D eslint typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-config-prettier globals eslint-plugin-vitest

# Prettier
pnpm add -D prettier

# Stylelint
pnpm add -D stylelint stylelint-config-standard

# Husky + lint-staged
pnpm add -D husky lint-staged

# Тестовое окружение (Vitest + Testing Library)
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# ESLint-плагин для Vitest
pnpm add -D eslint-plugin-vitest
```

## 8. Команды проверки (соответствие DoD)

После выполнения работ агент обязан прогнать и убедиться, что все зелёные:

```bash
pnpm install          # без ошибок, зависимости устанавливаются по lock-файлу
pnpm check-types      # tsc --noEmit — без ошибок (включая типы vitest globals)
pnpm lint             # eslint . — без ошибок (включая тестовые файлы)
pnpm stylelint        # stylelint src/**/*.css — без ошибок
pnpm format:check     # prettier --check . — без ошибок
pnpm test:run         # vitest run — тесты проходят (включая App.test.tsx)
pnpm test:coverage    # vitest run --coverage — покрытие собирается, отчёт в coverage/
pnpm build            # vite build — production-сборка успешна
pnpm dev              # dev-сервер поднимается (проверить вручную)
```

Проверка хуков (вручную):

```bash
# pre-commit должен отработать на staged-изменениях
git add -A && git commit --allow-empty -m "test: hook check" --no-verify=false || true

# pre-push должен запустить test:run + check-types + build
git push --dry-run
```

## 9. Definition of Done (критерии приёмки)

- [ ] Стандартный Vite boilerplate очищен; проект на Vite + React + TypeScript запускается (`pnpm dev`) и собирается (`pnpm build`) без ошибок.
- [ ] `pnpm lint`, `pnpm check-types`, `pnpm stylelint`, `pnpm format:check`, `pnpm test:run` и `pnpm build` выполняются успешно.
- [ ] Настроены и работают ESLint (flat config), Prettier и Stylelint (с учётом Tailwind v4).
- [ ] Tailwind CSS v4 подключён и применяется (стили из `@import "tailwindcss"` попадают в сборку).
- [ ] Тестовое окружение настроено и работает: Vitest + Testing Library + jsdom, `pnpm test:run` завершается успешно.
- [ ] Создан setup-файл `src/test/setup.ts` (jest-dom matchers + cleanup) и он подключён через `setupFiles` в конфиге Vitest.
- [ ] Создан smoke-тест `src/App.test.tsx`, проходящий успешно (рендер + взаимодействие через `@testing-library/user-event`).
- [ ] Скрипты для тестов добавлены в `package.json`: `test`, `test:run`, `test:coverage` — все корректны и выполняются.
- [ ] Покрытие кода настраивается и собирается через `@vitest/coverage-v8` (`pnpm test:coverage` формирует отчёт в `coverage/`).
- [ ] TypeScript корректно типизирует глобальные тестовые функции при `globals: true` (`pnpm check-types` проходит без `no-undef`-подобных ошибок на `describe`/`it`/`expect`/`vi`).
- [ ] ESLint проходит на тестовых файлах без ложных ошибок (глобальные тестовые функции распознаны; `*.test.ts(x)` / `*.spec.ts(x)` линтятся).
- [ ] Артефакты тестов и покрытия (`coverage/`) добавлены в `.gitignore` и исключены из lint/stylelint/prettier.
- [ ] Git hooks через Husky автоматически запускают проверки: pre-commit → lint-staged, pre-push → `test:run` + `check-types` + `build`. Хуки блокируют коммит/пуш при ошибках.
- [ ] Зафиксированы версия Node 22 (`.nvmrc` + `engines`) и конкретная версия pnpm (`packageManager` + `engines`).
- [ ] Проект переведён на pnpm: `package-lock.json` удалён, есть `pnpm-lock.yaml` и `.npmrc`.
- [ ] Присутствуют базовые файлы: `.gitignore` (расширенный), `.editorconfig`, `.env.example`, `.npmrc`, `.nvmrc`.
- [ ] `README.md` содержит инструкцию под pnpm, описание всех команд (включая тестовые) и раздел по тестированию — проект можно клонировать и запустить по README без дополнительной ручной настройки.
- [ ] Все изменения закоммичены (при условии, что заказчик явно попросит коммит; иначе оставить staged/unstaged на ревью).

## 10. Примечания для агента-исполнителя

- Не добавлять CI-конфигурацию (явно исключено заказчиком).
- Не вводить бизнес-логику, FSD-структуру — вне области задачи.
- Тестовое окружение входит в задачу: настроить Vitest + Testing Library + jsdom + coverage, создать setup и smoke-тест. Написание содержательных тестов бизнес-логики не требуется — достаточно smoke-теста на `App.tsx`.
- Не коммитить `.idea/`, `node_modules/` и локальные `.env`-файлы. `pnpm-lock.yaml` должен быть закоммичен.
- Конфигурация Stylelint должна быть совместима с Tailwind CSS v4; не использовать конфигурации, предназначенные только для Tailwind v3, если они вызывают ошибки или предупреждения на синтаксисе Tailwind v4.
- Не обновлять существующие зависимости без необходимости. Использовать версии, совместимые с зафиксированным стеком проекта; версии новых зависимостей должны быть зафиксированы в lock-файле.
- Соблюдать существующий стиль кода (без точек с запятой, одинарные кавычки) — он закреплён в Prettier-конфиге.
