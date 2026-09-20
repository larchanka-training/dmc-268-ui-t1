---
document_id: frontend-architecture
version: '3.0-draft'
language: ru
status: draft
implementation_status: not_implemented
---

# Архитектура frontend — AI Code Review

**Статус:** черновик для согласования с backend-командой.  
**Редакция:** 20 сентября 2026 года.  
**Назначение:** этот документ описывает целевую архитектуру Web UI: слои, состояние, UI-систему, контракт данных и требования frontend к API. Он не добавляет зависимости, не меняет базовый setup и не является описанием уже реализованного интерфейса.

Документ использует 12-раздельный шаблон arc42 для описания архитектуры. Feature-Sliced Design (FSD) — отдельное решение о структуре frontend-кода.

## 1. Введение и цели

### 1.1. Пользовательский сценарий

Основной сценарий первой версии — просмотр одного прогона AI-ревью (`ReviewRun`). Пользователь открывает запуск и видит:

- статус, проверенный commit и сводку результата;
- список файлов, изменённых в проверенном PR;
- diff выбранного файла, hunks и строки;
- findings AI, привязанные к строкам diff;
- при необходимости — техническую историю действий worker в `RunInspector`.

`ReviewWorkspace` похож на вкладку _Files changed_ у PR-провайдера, но показывает снимок именно того diff и тех findings, которые относятся к выбранному `ReviewRun`. Это не копия интерфейса GitHub и не смешивает комментарии людей, других ботов или последующих запусков.

### 1.2. Цели

- Точно отобразить diff и inline-finding на целевой строке.
- Сохранить читаемость при большом числе файлов и hunks.
- Разделить серверные данные, UI-состояние и локальное состояние компонента.
- Позволить подключить backend API без переписывания UI.
- Дать диагностический trace прогона без раскрытия исходного кода, секретов и полного LLM-payload по умолчанию.

### 1.3. Вне scope этой редакции

Список репозиториев, список PR, история запусков на странице PR, login, landing, профиль, настройки профиля, Stripe и billing не проектируются как экраны и компоненты в этой задаче. Backend-модель уже связывает `Repository → MergeRequest → ReviewRun`; это достаточно, чтобы добавить эти сценарии позже без изменения модели просмотра одного запуска.

## 2. Ограничения

| ID        | Статус    | Ограничение                                                                                                                                                                                    |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FE-CON-01 | confirmed | Базовая основа из `develop`: pnpm, Node.js 22, React, TypeScript, Vite, Tailwind CSS v4, ESLint, Prettier, Stylelint, Vitest и React Testing Library.                                          |
| FE-CON-02 | confirmed | Git hooks работают через `.githooks` и `core.hooksPath`; Husky не используется.                                                                                                                |
| FE-CON-03 | accepted  | UI строится на Tailwind CSS v4 и Headless UI. Tailwind отвечает за стиль, Headless UI — за доступное интерактивное поведение. Ant Design, shadcn/ui и другой визуальный UI-kit не добавляются. |
| FE-CON-04 | accepted  | Серверные данные хранятся в TanStack Query; общий UI-state — в Zustand; состояние одного компонента — в React state.                                                                           |
| FE-CON-05 | accepted  | React Hook Form, Zod и `@hookform/resolvers` используются для будущих форм. Zod также валидирует API DTO на границе frontend.                                                                  |
| FE-CON-06 | confirmed | Пока backend API не готов, UI получает типизированные данные через mock adapter с теми же публичными типами, что и HTTP-клиент.                                                                |
| FE-CON-07 | open      | Полная модель `review_run_actions`, правила доступа к trace, формат API и realtime-политика ожидают согласования с backend.                                                                    |

Принятые библиотеки могут отсутствовать в `package.json`: их подключение относится к отдельной реализации, а не к этому архитектурному документу.

## 3. Контекст и границы

```text
Пользователь в браузере
        │
        ▼
React Web UI ── HTTPS/JSON ──► Backend API
        │                          │
        ▼                          ├── Git provider
Tailwind + Headless UI             ├── review worker / LLM
                                   └── БД и защищённое хранилище payload
```

Frontend не читает БД, не клонирует репозитории, не получает Git-токены, не собирает LLM-контекст и не публикует комментарии в GitHub напрямую. Эти обязанности принадлежат backend.

Frontend получает только подготовленные API-данные. Право показать diff, context или trace проверяется backend на каждом соответствующем запросе.

## 4. Стратегия решения

### 4.1. Структура кода

Код организуется по **Feature-Sliced Design (FSD)**:

```mermaid
flowchart TB
  app[app\nbootstrap, providers, globals]
  pages[pages\nмаршрут одного прогона]
  widgets[widgets\nкрупные области UI]
  features[features\nдействия пользователя]
  entities[entities\nмодели и API domain]
  shared[shared\nобщие UI и инфраструктура]

  app --> pages
  pages --> widgets
  widgets --> features
  widgets --> entities
  features --> entities
  entities --> shared
```

Импорт разрешён только вниз по слоям. Внешний импорт из слайса идёт через его `index.ts`; `shared` не импортирует code-review сущности.

```text
src/
├── app/
│   ├── providers/                 # QueryClient, ErrorBoundary
│   ├── mocks/                     # временный типизированный adapter
│   └── styles/
├── pages/
│   └── review-run/                # ReviewRunPage
├── widgets/
│   ├── review-workspace/          # FileList + DiffViewer
│   ├── review-summary/
│   └── run-inspector/
├── features/
│   ├── expand-context/
│   └── filter-findings/
├── entities/
│   ├── review-run/
│   ├── diff/
│   ├── review-finding/
│   └── review-run-action/         # после согласования API trace
└── shared/
    ├── api/                       # transport и базовые ошибки
    ├── config/
    ├── lib/
    └── ui/                        # нейтральные примитивы проекта
```

### 4.2. UI-система

`shared/ui` содержит независимые от code-review обёртки: `Button`, `Dialog`, `Menu`, `Select`, `CollapsibleSection`, `StatusBadge`, `ScrollableContainer`, `LoadingState`, `EmptyState`, `ErrorState` и `Toast`.

Headless UI используется там, где нужны навигация с клавиатуры, управление фокусом, ARIA и доступное интерактивное поведение. В `shared/ui` не размещаются `DiffViewer`, finding, логика PR или API конкретной сущности.

## 5. Представление строительных блоков

### 5.1. Композиция страницы

Окончательный layout — вкладки, колонки, секции или отдельные маршруты — намеренно не выбирается сейчас. Независимые компоненты должны быть готовы к любому из этих вариантов.

```text
ReviewRunPage
├── RunHeader
├── ReviewSummary
├── ReviewWorkspace
│   ├── FileList
│   └── DiffViewer
│       └── DiffHunk
│           └── DiffLine
│               └── ReviewCommentThread
└── RunInspector
    └── ActionTree
        └── request / response выбранного действия
```

| Компонент             | Назначение                                                                          | Основные данные                                       |
| --------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `ReviewRunPage`       | Контейнер конкретного `runId`; загружает и связывает серверные данные.              | `ReviewRun`, diff, findings, actions.                 |
| `RunHeader`           | Метаданные прогона: статус, commit, модель, время, длительность, безопасная ошибка. | `ReviewRun`.                                          |
| `ReviewSummary`       | Количество findings, severity, опубликованные комментарии, отклонённые findings.    | `ReviewRun`, `ReviewFinding[]`, `PublishedComment[]`. |
| `ReviewWorkspace`     | Результат ревью: изменённые файлы и их diff.                                        | `DiffFile[]`, findings.                               |
| `FileList`            | Список изменённых файлов и количество findings; выбирает файл.                      | `DiffFileSummary[]`, `selectedFile`.                  |
| `DiffViewer`          | Показывает **один выбранный** `DiffFile`, не массив viewers.                        | `DiffFile`, `ReviewFinding[]`.                        |
| `DiffHunk`            | Непрерывный блок изменений с заголовком `@@`.                                       | `DiffHunk`.                                           |
| `DiffLine`            | Добавленная, удалённая или контекстная строка с номерами old/new.                   | `DiffLine`.                                           |
| `ReviewCommentThread` | Показывает finding у строки и статус его публикации в Git-provider.                 | `ReviewFinding`, `PublishedComment?`.                 |
| `ContextExpander`     | Запрашивает скрытый контекст только для указанного диапазона.                       | `FileSliceRequest`.                                   |
| `RunInspector`        | Технический trace запуска, отдельно от результата ревью.                            | `ReviewRun`, `ReviewRunAction[]`.                     |
| `ActionTree`          | Хронология действий; одинаковые соседние tools могут группироваться в UI.           | `ReviewRunAction[]`, выбранный action.                |

### 5.2. Что показывает `ReviewWorkspace`

`ReviewWorkspace` показывает **все изменённые файлы проверенного PR**, но рендерит diff одного выбранного файла за раз. Файлы без findings также видны: это позволяет понять покрытие запуска. Внутри diff показываются только нормализованные findings, связанные с линией. Полный raw-ответ LLM не вставляется рядом с каждой строкой.

Finding без корректной привязки к строке отображается в `ReviewSummary`, а не искусственно размещается в `ReviewCommentThread`.

## 6. Представление выполнения

### 6.1. Открытие завершённого прогона

1. `ReviewRunPage` получает `runId` из маршрута или входного параметра.
2. Entity-level hooks TanStack Query запрашивают run, список файлов, diff выбранного файла, findings и опубликованные комментарии.
3. `ReviewWorkspace` показывает `LoadingState`, `ErrorState` или данные без ручного `fetch` в компонентах.
4. Пользователь выбирает файл; Zustand меняет только `selectedFile`, а TanStack Query получает его diff.
5. `DiffViewer` размещает finding рядом с его `oldLine` или `newLine`.

### 6.2. Прогон в процессе

1. API возвращает нетерминальный статус `ReviewRun`.
2. TanStack Query обновляет run по согласованной политике polling или SSE.
3. UI отображает только серверный статус; frontend не делает вывод о завершении самостоятельно.
4. При наличии action API `RunInspector` получает новые завершённые действия в том же query-кэше.

### 6.3. Просмотр технического действия

1. `ActionTree` показывает безопасные `tool`, время, длительность и статус записи.
2. При выборе действия UI показывает `requestPreview` и `responsePreview`.
3. Полный payload запрашивается по `responseRef` только при наличии backend-разрешения и только если он не истёк по retention policy.

## 7. Представление развёртывания

Vite собирает статические assets; существующий Docker/nginx/Terraform-контур отдаёт их браузеру. В bundle попадают только публичные переменные окружения с префиксом `VITE_`, например `VITE_API_BASE_URL`.

Git-токены, ключи LLM, Stripe secret key, полный context и raw-action payload не попадают в environment frontend, bundle или browser logs.

## 8. Сквозные концепции

### 8.1. Состояние

| Данные                                            | Владелец          | Пример ключа / store                           |
| ------------------------------------------------- | ----------------- | ---------------------------------------------- |
| Детали прогона                                    | TanStack Query    | `['review-runs', runId]`                       |
| Список файлов                                     | TanStack Query    | `['review-runs', runId, 'files']`              |
| Diff файла                                        | TanStack Query    | `['review-runs', runId, 'diff', path]`         |
| Findings и публикации                             | TanStack Query    | `['review-runs', runId, 'findings']`           |
| Trace действий                                    | TanStack Query    | `['review-runs', runId, 'actions']`            |
| Контекстный срез                                  | TanStack Query    | `['review-runs', runId, 'files', path, range]` |
| Выбранный файл, фильтры severity, раскрытые hunks | Zustand в виджете | `review-workspace/model/store`                 |
| Выбранное действие, раскрытые узлы trace          | Zustand в виджете | `run-inspector/model/store`                    |
| hover, открытый popover, ввод одного поля         | React state       | владелец компонента                            |

Серверные данные никогда не копируются в Zustand. Store хранит только пользовательский выбор и краткоживущее представление.

### 8.2. Контракт данных

Источник истины для runtime DTO — будущие Zod-схемы в `entities/*/model`. Ниже приведён обязательный публичный состав полей; названия API предполагаются в `camelCase`. Backend может хранить поля иначе, но обязан сериализовать согласованный DTO.

```ts
type ReviewRun = {
  id: string
  mergeRequestId: string
  headSha: string
  status: 'queued' | 'running' | 'publishing' | 'completed' | 'failed' | 'cancelled'
  trigger: 'webhook' | 'manual' | 'mention'
  startedAt: string | null
  finishedAt: string | null
  lastProgressAt: string
  failureReason: string | null
  model: string | null
  tokensUsed: number | null
  durationSeconds: number | null
  rejectedFindings: number
}

type ReviewFinding = {
  id: string
  reviewRunId: string
  filePath: string
  side: 'left' | 'right'
  oldLine: number | null
  newLine: number | null
  category: 'security' | 'correctness' | 'performance' | 'readability'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  suggestion: string | null
  confidence: number | null
}

type PublishedComment = {
  id: string
  reviewRunId: string
  findingId: string | null
  providerCommentId: string
  kind: 'summary' | 'inline'
  publishedAt: string
}

type DiffFileSummary = {
  path: string
  additions: number
  deletions: number
  findingsCount: number
}

type DiffFile = {
  path: string
  language: string | null
  hunks: DiffHunk[]
}

type DiffHunk = {
  header: string
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

type DiffLine = {
  kind: 'added' | 'removed' | 'context'
  oldLine: number | null
  newLine: number | null
  content: string
}

type FileSlice = {
  path: string
  startLine: number
  lines: string[]
  nextStartLine: number | null
}
```

`ReviewFinding` — результат модели после валидации и дедупликации; `PublishedComment` — факт публикации этого finding у Git-provider. Они не являются одной сущностью. `ReviewCommentThread` получает finding и, при наличии, публикационный статус.

`DiffFile`, `DiffHunk` и `DiffLine` должны приходить как snapshot, относящийся к `ReviewRun.headSha`. Frontend не извлекает diff из внутреннего LLM-payload и не рассчитывает diff по текущему состоянию PR.

### 8.3. Контракт trace: `ReviewRunAction`

`RunInspector` требует историю отдельных действий worker. В backend PR #5 такой таблицы пока нет: там есть `context_payloads`, которые хранят chunks контекста, переданные модели. По комментарию frontend в PR предложено заменить этот подход на аудит действий `review_run_actions`; решение ожидает backend-команду.

Предлагаемый DTO и будущая сущность:

```ts
type ReviewRunAction = {
  id: string
  runId: string
  index: number
  tool: string
  status: 'running' | 'completed' | 'failed'
  requestPreview: unknown | null
  responsePreview: unknown | null
  responseRef: string | null
  error: { code: string; message: string } | null
  startedAt: string
  durationMs: number | null
}
```

```text
review_runs 1 ─── N review_run_actions

review_run_actions
├── id
├── review_run_id
├── index                 # стабильный порядок в одном run
├── tool                  # get_diff, get_tree, read_file, build_context, call_llm, post_review
├── status
├── request_preview JSONB
├── response_preview JSONB
├── response_ref NULL     # большой payload отдельным защищённым запросом
├── error_code NULL
├── error_message NULL
├── started_at
└── duration_ms NULL
```

`ActionTree` может сам сгруппировать подряд идущие действия с одинаковым `tool`; отдельная parent-child таблица для первой версии не нужна. Поле `index` обязательно для воспроизводимой хронологии.

### 8.4. Безопасность и хранение исходного кода

`responseRef` уменьшает размер обычного API-ответа, но сам по себе не решает вопрос хранения кода. Исходники, prompt и raw LLM-output могут содержать интеллектуальную собственность, персональные данные или секреты.

| Категория         | Правило                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Итоговые данные   | `ReviewRun`, findings и сведения о публикации хранятся по утверждённой политике хранения.                             |
| Код и raw payload | Хранятся отдельно от основной записи run, шифруются, имеют ограниченный TTL и удаляются автоматически.                |
| Preview           | В `review_run_actions` попадает только очищенное и ограниченное по размеру preview.                                   |
| Секреты           | Токены, пароли, ключи и чувствительные фрагменты маскируются до логирования и записи.                                 |
| Доступ            | Backend проверяет права на run, diff, context и полный response; frontend не является границей безопасности.          |
| Внешний LLM       | Условия передачи кода, регион обработки, использование для обучения и DPA определяются владельцем продукта и юристом. |

## 9. Требования frontend к API

Эти требования описывают необходимую для UI публичную границу; они не означают, что endpoints уже реализованы.

| Endpoint                                                              | Ответ                                                    | Назначение                                                                      |
| --------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /api/review-runs/{runId}`                                        | `ReviewRun` + краткая ссылка на PR                       | Заголовок и статус страницы.                                                    |
| `GET /api/review-runs/{runId}/files`                                  | `DiffFileSummary[]`                                      | `FileList`; только изменённые файлы данного snapshot.                           |
| `GET /api/review-runs/{runId}/diff?path=…`                            | `DiffFile`                                               | `DiffViewer` одного выбранного файла.                                           |
| `GET /api/review-runs/{runId}/findings`                               | `ReviewFinding[]` + `PublishedComment[]`                 | Inline findings, summary и статус публикации.                                   |
| `GET /api/review-runs/{runId}/files/{path}/context?startLine=&count=` | `FileSlice`                                              | Дочитывание контекста по явному действию пользователя.                          |
| `GET /api/review-runs/{runId}/actions`                                | `ReviewRunAction[]`                                      | `ActionTree`; появляется после согласования trace-модели.                       |
| `GET /api/review-runs/{runId}/actions/{actionId}/response`            | большой очищенный payload                                | Только авторизованный запрос по `responseRef`; `404`/`410` допустимы после TTL. |
| `GET /api/stream` **или** polling-контракт                            | событие `reviewRun.updated` минимум с `runId` и `status` | Обновление активного прогона.                                                   |

### 9.1. Требование к неизменяемости diff

Backend обязан отдавать diff, соответствующий проверенному `headSha`, а не текущему состоянию PR. Для точного сравнения backend должен либо сохранить raw patch/snapshot, либо зафиксировать обе revision, необходимые провайдеру для воспроизведения diff. Один `headSha` без базовой revision может оказаться недостаточным, если target branch изменился.

### 9.2. API-boundary

HTTP-клиент возвращает `unknown`; entity API валидирует DTO Zod-схемой и только после этого отдаёт типизированную модель в query hook. API DTO не смешивается с props UI без явного mapping.

## 10. Решения и открытые вопросы

### 10.1. Принятые решения

| ID        | Решение                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------- |
| FE-DEC-01 | FSD: `app → pages → widgets → features → entities → shared`.                                        |
| FE-DEC-02 | Tailwind CSS v4 + Headless UI; общие примитивы проекта — в `shared/ui`.                             |
| FE-DEC-03 | TanStack Query для server-state, Zustand для общего UI-state, React state для локального состояния. |
| FE-DEC-04 | Zod на API boundary; React Hook Form + Zod для будущих форм.                                        |
| FE-DEC-05 | `ReviewWorkspace` отображает все изменённые файлы, но `DiffViewer` рендерит один выбранный файл.    |
| FE-DEC-06 | `RunInspector` и `ReviewWorkspace` — независимые виджеты; их будущий layout не фиксируется.         |

### 10.2. Незакрытые решения по `review_run_actions`

| ID         | Вопрос                                                                                                                  | Почему нужен ответ                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| FE-OPEN-01 | Заменяет ли `review_run_actions` `context_payloads` полностью или контекст сохраняется в отдельном защищённом snapshot? | `context_payloads` хранит то, что видел LLM; журнал действий отвечает на другой вопрос. Удаление без согласования может ухудшить воспроизводимость. |
| FE-OPEN-02 | Какие `tool` допустимы и кто владеет их словарём?                                                                       | UI может показать неизвестный tool, но analytics, локализация и группировка требуют стабильных имён.                                                |
| FE-OPEN-03 | Нужны ли action-level статусы и ошибки?                                                                                 | Без них inspector плохо объясняет текущий или упавший запуск.                                                                                       |
| FE-OPEN-04 | Какой максимальный размер preview и где хранится полный payload?                                                        | Нужен баланс между полезностью trace, стоимостью и безопасностью.                                                                                   |
| FE-OPEN-05 | Какой TTL для diff, context, prompt и raw LLM-response?                                                                 | Это требование защиты данных и стоимости хранения, а не UI-деталь.                                                                                  |
| FE-OPEN-06 | Кто имеет доступ к полному `responseRef`?                                                                               | Требуется RBAC/проверка прав на backend.                                                                                                            |
| FE-OPEN-07 | Нужен ли raw prompt и raw ответ LLM в первой версии?                                                                    | Для результата ревью они не нужны; полезны только для ограниченной диагностики.                                                                     |
| FE-OPEN-08 | SSE или polling для активных запусков?                                                                                  | От этого зависит invalidation strategy TanStack Query.                                                                                              |
| FE-OPEN-09 | Какая базовая revision входит в snapshot diff?                                                                          | Нужна неизменяемость отображаемого review после новых push в PR.                                                                                    |

## 11. Качество и проверка

| Область        | Проверяемый результат                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Diff           | Added, removed и context-строки имеют правильные номера; finding появляется у правильной стороны и строки. |
| File selection | Выбор файла не дублирует diff в глобальном server-state и не заставляет рендерить все файлы сразу.         |
| Context        | `ContextExpander` дочитывает только запрошенный диапазон и корректно обрабатывает `404`/`410`.             |
| Server state   | Loading, error, retry и обновления идут через TanStack Query.                                              |
| Inspector      | Действия упорядочены по `index`; большой payload не загружается до явного открытия.                        |
| Accessibility  | Интерактивные shared-компоненты поддерживают клавиатуру, фокус и ARIA через Headless UI.                   |
| API boundary   | Некорректный DTO не попадает в UI: Zod возвращает контролируемую ошибку.                                   |

Для UI применяются Vitest и React Testing Library. Тесты проверяют наблюдаемое поведение пользователя, а не CSS-классы или внутреннюю структуру компонентов.

## 12. Глоссарий и ресурсы

| Термин             | Значение                                                                             |
| ------------------ | ------------------------------------------------------------------------------------ |
| `ReviewRun`        | Один неизменяемый запуск AI-ревью конкретного commit PR.                             |
| `DiffFile`         | Изменения одного файла в snapshot прогона.                                           |
| `DiffHunk`         | Непрерывный блок строк изменений.                                                    |
| `ReviewFinding`    | Нормализованный результат модели, переживший валидацию и дедупликацию.               |
| `PublishedComment` | Запись о публикации finding или summary у Git-provider.                              |
| `ReviewRunAction`  | Одно техническое действие worker внутри прогона.                                     |
| `RunInspector`     | UI технической истории действий; не основной результат ревью.                        |
| `responseRef`      | Ссылка на большой защищённый payload, который не входит в обычный ответ actions API. |

### Ресурсы

- [Issue #5 — Frontend Architecture](https://github.com/larchanka-training/dmc-268-ui-t1/issues/5)
- [PR #4 — базовый setup frontend](https://github.com/larchanka-training/dmc-268-ui-t1/pull/4)
- [PR #5 backend — архитектура и ERD](https://github.com/larchanka-training/dmc-268-api-t1/pull/5)
- [Комментарий frontend о `review_run_actions` в PR #5](https://github.com/larchanka-training/dmc-268-api-t1/pull/5#discussion_r4057422261)
- [Пример архитектурного документа команды T6](https://github.com/larchanka-training/dmc-268-ui-t6/blob/1cc57cd72009312c4a820d3bd15a72fcd67764b9/docs/FRONTEND_ARCHITECTURE.md)
- [arc42 — обзор шаблона](https://arc42.org/overview/)
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Zod](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/)
- [Headless UI](https://headlessui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
