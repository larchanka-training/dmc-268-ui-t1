# DMC-268 UI (команда 1)

Фронтенд на Vite + React + TypeScript для DMC-268 Team 1.

## Правила разработки и агенты

Критичный минимум — в [`AGENTS.md`](AGENTS.md). Детали лежат в `.agents/`:

| Что                                                | Где                                                          |
| -------------------------------------------------- | ------------------------------------------------------------ |
| Правила стека: команды, слои FSD, состояние, тесты | [`.agents/rules/frontend.md`](.agents/rules/frontend.md)     |
| Ветки, задачи, пул-реквесты, работа с замечаниями  | [`.agents/rules/git-and-pr.md`](.agents/rules/git-and-pr.md) |
| Скиллы: TDD, ревью, пул-реквест                    | [`.agents/skills/`](.agents/skills/)                         |
| Шаблоны кода и тестов                              | [`.agents/templates/frontend/`](.agents/templates/frontend/) |

Свой инструмент каждый подключает локально — каталоги инструментов не коммитятся:

```bash
ln -s ../.agents/skills .opencode/skills   # или .claude/, .cursor/, .codex/
openspec init --tools <tool>               # то же самое, если инструмент поддержан
ln -s AGENTS.md CLAUDE.md                  # Claude Code читает CLAUDE.md
```

Симлинк, а не копия: копия разойдётся с оригиналом на первой же правке. Antigravity исключение —
он читает `.agents/skills` сам.

Системные промпты ревью-агента лежат в бэкендовом репозитории, `prompts/review/`.

## Требования

- **Node.js 24 LTS** — версия зафиксирована в `.nvmrc` и в поле `engines` файла `package.json`.
  Если используется [nvm](https://github.com/nvm-sh/nvm), выполните `nvm use` для автоматического переключения.
- **pnpm 12+** — точная версия зафиксирована в поле `packageManager` файла `package.json`.
  Отдельно pnpm не ставится: он приходит с Node.js через [Corepack](https://nodejs.org/api/corepack.html),
  который сам берёт версию из `packageManager`. Один раз включите обёртки:

  ```bash
  corepack enable
  ```

## Быстрый старт

```bash
pnpm install
pnpm dev
```

Dev-сервер запускается на `http://localhost:3000` и автоматически открывает вкладку в браузере.
По этому адресу открывается лендинг; приложение — под `http://localhost:3000/app/`. Так же устроен стенд:
`/app/*` отдаёт приложение, остальное — статика, несуществующий путь вне `/app/` получает страницу 404.
На стенде гостя без cookie `session` nginx уводит с `/app/*` на `/login?redirect=<путь>`; dev-сервер этого
не делает — там приложение работает на моках. Открыть приложение в контейнере без бэкенда:
`curl -b session=dev …` или cookie `session` с любым значением в DevTools.

Абсолютный адрес для canonical, Open Graph, `sitemap.xml` и `robots.txt` берётся из переменной сборки
`PUBLIC_ORIGIN` (по умолчанию `http://localhost:3000`), в образе — из аргумента сборки:

```bash
PUBLIC_ORIGIN=https://example.test pnpm build
docker build --build-arg PUBLIC_ORIGIN=https://example.test -t dmc268-ui .
scripts/check-routes.sh http://localhost:8080   # маршруты поднятого контейнера
```

Вход выполняет бэкенд (api#47): `/login` ведёт на `/api/v1/auth/github/login`, после входа бэкенд ставит
httpOnly cookie `session`. Кабинет берёт профиль из `GET /api/v1/auth/me`, на `401` от любой ручки уводит на
`/login?redirect=<путь>`, выход — `POST /api/v1/auth/logout`. Токенов в JS нет.

Локально (по умолчанию, с моком) dev-сервер сам отвечает на `/api/v1/auth/me` и `/logout`: с cookie `session` с любым значением —
профиль-заглушка, без неё — `401`. Чтобы войти, поставьте в DevTools на `localhost:3000` cookie `session=dev`.

## Кабинет (mock API)

- Сессия в httpOnly cookie, профиль из `/api/v1/auth/me`, выход через `/api/v1/auth/logout`
- App shell: sidebar, header, навигация, статус авторизации, светлая/тёмная тема
- Одна страница «Репозитории»: все репозитории установок GitHub App с переключателем ревью и переходом в настройки репозитория
- Публичная «Помощь» (`/app/help`)
- Данные экранов — по контракту бэкенда через `ApiTransport`: mock adapter по умолчанию, бэкенд при `VITE_USE_MOCK_API=false`. Ручки, которые бэкенд ещё не реализовал, отвечают `501`, и экран говорит об этом

### UI: Ant Design и Tailwind

Кабинет собран на **antd** (формы, таблицы, layout). **Tailwind v4** подключён только как утилиты (`theme` + `utilities` в `src/index.css`, без preflight), чтобы не перебивать стили antd. Палитра и токены antd синхронизируются из `src/shared/theme/palette.ts` (CSS-переменные `--app-*`).

Дополнительные переменные (опционально). `VITE_USE_MOCK_API`, `VITE_API_PROXY_TARGET` и `PUBLIC_ORIGIN`
читаются из `.env`, `.env.local` и окружения оболочки:

| Переменная               | По умолчанию            | Описание                                                                                                                   |
| ------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `VITE_USE_MOCK_API`      | `true`                  | `false` — мока нет: данные кабинета и вход идут на бэкенд, dev-сервер проксирует `/api` на `VITE_API_PROXY_TARGET`         |
| `VITE_API_PROXY_TARGET`  | `http://localhost:8000` | Адрес бэкенда для прокси `/api` при `VITE_USE_MOCK_API=false`                                                              |
| `VITE_API_BASE_URL`      | `/api/v1`               | Базовый URL API (OpenAPI v1)                                                                                               |
| `VITE_OTEL_EXPORTER_URL` | —                       | Приёмник OTLP/HTTP для ошибок и трейсов кабинета, путь на том же адресе (`/otlp/v1/traces`). Без него телеметрия выключена |
| `VITE_OTEL_ENVIRONMENT`  | `local`                 | `deployment.environment.name` телеметрии                                                                                   |
| `VITE_APP_VERSION`       | `dev`                   | `service.version` телеметрии; при деплое — sha коммита                                                                     |

Против настоящего бэкенда: `VITE_USE_MOCK_API=false pnpm dev`. Прокси не переписывает путь и пропускает
cookie, а `Origin` браузера остаётся `http://localhost:3000` — поэтому у API должен стоять
`PUBLIC_ORIGIN=http://localhost:3000`, иначе изменяющие запросы получат `403 ORIGIN_FORBIDDEN`, а в GitHub App —
callback `http://localhost:3000/api/v1/auth/github/callback`.

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
| `pnpm api:sync`      | Обновить контракт API и перегенерировать типы (см. ниже).         |
| `pnpm api:check`     | Проверить, что контракт и типы совпадают с зафиксированным sha.   |

## Контракт API

Типы API генерируются из контракта бэкенда — `docs/openapi/openapi.json` в
[`dmc-268-api-t1`](https://github.com/larchanka-training/dmc-268-api-t1); бэкенд экспортирует
его из кода FastAPI. Контракт берётся по зафиксированному коммиту, sha лежит в
`src/shared/api/contract/VERSION`; рядом — сам `openapi.json` (байт в байт как у бэкенда) и
сгенерированный `schema.d.ts`.

Фиксируется только коммит из `develop` бэкенда. Обновить контракт после мёржа правки в бэкенде:

```bash
pnpm api:sync         # взять голову develop бэкенда, скачать контракт, перегенерировать типы
pnpm typecheck        # поправить код, который разошёлся с новым контрактом
```

Пока правка контракта ещё в PR бэкенда, а фронт уже в работе, можно временно зафиксировать
коммит из этого PR: `pnpm api:sync <sha>`. CI такой коммит в мёрж не пропустит — после мёржа
бэкенда запустите `pnpm api:sync` ещё раз. Перекачать контракт по уже записанному sha —
`pnpm api:sync "$(cat src/shared/api/contract/VERSION)"`.

`pnpm api:check` ничего не меняет и проверяет по порядку:

1. контракт, скачанный по sha из `VERSION`, совпадает с закоммиченным `openapi.json`, а типы,
   сгенерированные из него во временный каталог, — с `schema.d.ts`;
2. этот sha входит в `develop` бэкенда (GitHub API `compare/<sha>...develop`); если нет —
   падает с сообщением «контракт взят не из develop бэкенда»;
3. если контракт в голове `develop` отличается от зафиксированного, выводит предупреждение
   «запустите pnpm api:sync», но не падает (в GitHub Actions — аннотацией `::warning::`).

В CI это job `contract`. Нужна сеть до `raw.githubusercontent.com`, `github.com` и
`api.github.com`. Если задан `GITHUB_TOKEN`, он уходит в запрос к GitHub API: без него лимит —
60 запросов в час с одного адреса.

Сгенерированные файлы руками не правятся. Нужного поля или ручки нет в контракте — сначала PR в
бэкенд с полем или роутом (запланированная ручка — заглушка с `501 NOT_IMPLEMENTED`), потом
`pnpm api:sync`.

## Git-хуки

Git-хуки настраиваются через `core.hooksPath` — скрипт `prepare` в `package.json` выполняет
`git config core.hooksPath .githooks` при установке зависимостей. Хуки хранятся в `.githooks/`
и версионируются вместе с проектом.

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
├── .nvmrc                 # Версия Node.js (24 LTS)
├── .prettierrc.mjs        # Конфигурация Prettier
├── .prettierignore        # Список игнорирования Prettier
├── eslint.config.mjs      # ESLint flat config
├── stylelint.config.mjs   # Конфигурация Stylelint
├── index.html             # HTML точка входа
├── package.json           # Скрипты, зависимости, engines
├── pnpm-workspace.yaml    # Настройки pnpm (engineStrict, сборка esbuild)
├── tsconfig.json          # Конфигурация TypeScript (строгий режим)
├── vite.config.ts         # Конфигурация Vite + Tailwind + Vitest
├── .githooks/             # Git-хуки (pre-commit, pre-push)
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
- [lint-staged](https://github.com/lint-staged/lint-staged) — линтинг staged-файлов
- Нативные git-хуки через `core.hooksPath` — автоматические проверки при коммите и пуше

## Деплой

Стенд: **https://62.169.24.237** — интерфейс на `/`, ручки бэкенда на `/api/v1/`. Сертификат Let's Encrypt выписан на IP и продлевается сам, подробности — в [`infra/README.md`](infra/README.md#https).

Выкатывается сам при мерже в `develop`: образ собирается в CI и публикуется в ghcr, затем OpenTofu применяет конфигурацию из `infra/` на сервере, и прогон проверяет по HTTPS, что по адресу отдаётся именно интерфейс и что API через него отвечает. Руками ничего запускать не нужно.

Запросы к API идут через тот же адрес: `nginx` внутри контейнера проксирует `/api/` на бэкенд по внутренней сети сервера, поэтому второго адреса браузеру не нужно и CORS не требуется.

**Стек бэкенда применяется первым** — интерфейс подключается к сети, которую создаёт он. PostgreSQL и RabbitMQ живут в [`dmc-268-api-t1`](https://github.com/larchanka-training/dmc-268-api-t1), здесь их нет.

Подробности — [`infra/README.md`](infra/README.md): откуда берётся образ, где лежит состояние, какие переменные обязательны. Контракт доставки записан в спеке `openspec/specs/frontend-delivery/`.
