# DMC-268 UI (Team 1)

Фронтенд на Vite + React + TypeScript для DMC-268 Team 1.

## Требования

- **Node.js 22 LTS** — версия зафиксирована в `.nvmrc` и в поле `engines` файла `package.json`.
  Если используется [nvm](https://github.com/nvm-sh/nvm), выполните `nvm use` для автоматического переключения.
- **pnpm 12+** — точная версия зафиксирована в поле `packageManager` файла `package.json`.
  Установите глобально, если ещё не установлен:

  ```bash
  npm install -g pnpm@12.3.4
  ```

  Либо включите через [Corepack](https://nodejs.org/api/corepack.html):

  ```bash
  corepack enable
  corepack prepare pnpm@12.3.4 --activate
  ```

## Быстрый старт

```bash
pnpm install
pnpm dev
```

Dev-сервер запускается на `http://localhost:3000` и автоматически открывает вкладку в браузере.

## Скрипты

| Команда              | Описание                                                          |
| -------------------- | ----------------------------------------------------------------- |
| `pnpm dev`           | Запуск Vite dev-сервера с HMR (порт 3000, автооткрытие браузера). |
| `pnpm build`         | Проверка типов + production-сборка (результат в `dist/`).         |
| `pnpm preview`       | Локальный предпросмотр production-сборки.                         |
| `pnpm check-types`   | Проверка типов TypeScript через `tsc --noEmit`.                   |
| `pnpm typecheck`     | Алиас для `check-types` (для совместимости с CI).                 |
| `pnpm lint`          | Запуск ESLint по всему проекту.                                   |
| `pnpm lint:fix`      | Запуск ESLint с `--fix` для автоисправления.                      |
| `pnpm stylelint`     | Запуск Stylelint для `src/**/*.css`.                              |
| `pnpm stylelint:fix` | Запуск Stylelint с `--fix`.                                       |
| `pnpm format`        | Форматирование всех файлов через Prettier.                        |
| `pnpm format:check`  | Проверка форматирования без записи изменений.                     |
| `pnpm test`          | Однократный прогон всех тестов (CI / pre-push).                   |
| `pnpm test:watch`    | Запуск Vitest в watch-режиме (интерактивно, для разработки).      |
| `pnpm test:coverage` | Однократный прогон со сбором покрытия через V8.                   |

## Git-хуки

Git-хуки управляются [Husky](https://typicode.github.io/husky/) и запускаются автоматически.

- **pre-commit** — запускает `lint-staged`, который линтит и форматирует только staged-файлы
  (ESLint + Prettier для JS/TS, Stylelint + Prettier для CSS, Prettier для JSON/MD/HTML).
- **pre-push** — запускает `pnpm test && pnpm check-types && pnpm build`, чтобы убедиться,
  что проект полностью работоспособен перед отправкой.

Для обхода хуков в исключительных ситуациях используйте `--no-verify`:

```bash
git commit --no-verify -m "wip"
git push --no-verify
```

## Тестирование

Тесты используют [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)
с [jsdom](https://github.com/jsdom/jsdom) в качестве DOM-среды.

- **Setup-файл:** `src/test/setup.ts` — подключает matchers из `@testing-library/jest-dom` и
  размонтирует компоненты после каждого теста (cleanup).
- **Тестовые файлы:** располагаются рядом с тестируемым модулем (co-location), например `App.tsx` → `App.test.tsx`.
- **Конфигурация:** секция `test` в `vite.config.ts` (среда jsdom, глобальные тестовые функции, покрытие через V8).

Запуск тестов:

```bash
pnpm test          # однократный прогон
pnpm test:watch    # watch-режим
pnpm test:coverage # однократный прогон + отчёт покрытия в coverage/
```

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните реальные значения:

```bash
cp .env.example .env
```

Все клиентские переменные должны иметь префикс `VITE_`. Файлы `.env` игнорируются в git и
никогда не должны коммититься.

## Структура проекта

```
.
├── .env.example           # Шаблон переменных окружения
├── .gitignore             # Правила игнорирования Git
├── .npmrc                 # Конфигурация pnpm
├── .nvmrc                 # Версия Node.js (22 LTS)
├── .prettierrc.mjs        # Конфигурация Prettier
├── .prettierignore        # Список игнорирования Prettier
├── eslint.config.mjs      # ESLint flat config
├── stylelint.config.mjs   # Конфигурация Stylelint
├── index.html             # HTML точка входа
├── package.json           # Скрипты, зависимости, engines
├── tsconfig.json          # Конфигурация TypeScript (строгий режим)
├── vite.config.ts         # Конфигурация Vite + Tailwind + Vitest
├── .husky/                # Git-хуки (pre-commit, pre-push)
└── src/
    ├── App.tsx            # Корневой компонент
    ├── App.test.tsx       # Smoke-тест для App
    ├── index.css          # Точка входа Tailwind CSS (@import "tailwindcss")
    ├── main.tsx           # Точка входа приложения
    ├── vite-env.d.ts      # Типы Vite + Vitest
    └── test/
        └── setup.ts       # Setup для тестов (jest-dom matchers + cleanup)
```

## Технологии

- [Vite](https://vitejs.dev/) — сборщик и dev-сервер
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) — UI-фреймворк со строгой типизацией
- [Tailwind CSS v4](https://tailwindcss.com/) — utility-first CSS (CSS-first конфигурация через `@tailwindcss/vite`)
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) — модульное и компонентное тестирование
- [ESLint](https://eslint.org/) (flat config) — линтинг кода
- [Prettier](https://prettier.io/) — форматирование кода
- [Stylelint](https://stylelint.io/) — линтинг CSS
- [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) — git-хуки
