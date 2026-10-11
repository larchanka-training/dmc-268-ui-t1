---
document_id: frontend-architecture
version: '6.1-draft'
language: ru
status: draft
implementation_status: planned
---

# Архитектура frontend — AI Code Review

**Статус.** Это архитектурный контракт для DoD
[Issue #5](https://github.com/larchanka-training/dmc-268-ui-t1/issues/5). Этот PR содержит
документ и правила выбора библиотек; исходный код viewer, mock adapter и OpenSpec-change в него
не входят. Их реализует [PR #19](https://github.com/larchanka-training/dmc-268-ui-t1/pull/19) по
этому документу и [плану тестирования](docs/testing/TEST_PLAN.md). Что меняется для реализации
относительно ревизии 5.0 — в §8.

## 1. Границы задачи

Экран `ReviewRunView` показывает один **mock-прогон** ревью:

- метаданные и статус прогона;
- сводку findings и их публикаций;
- список изменённых файлов;
- один выбранный diff в режимах unified и side-by-side;
- свёрнутый context, inline findings и фильтр severity;
- техническую хронологию прогона (`RunInspector`).

В задачу не входят HTTP API, `fetch`, маршрутизация, polling, авторизация, GitHub/GitLab,
загрузка скрытого context по сети и полный payload действий. Mock — это не обещание HTTP DTO и
не копия таблиц backend: это данные, достаточные для честного рендера и тестов.

### 1.1 Граница с backend

Общими с backend являются значения домена: семь статусов `ReviewRun`, стороны строки `old` и
`new`, severity и category finding. Будущий adapter должен валидировать ответ на своей границе и
преобразовать его в UI-модель.

Diff прогона — это разница между `base_sha` и `head_sha` этого прогона. Backend сейчас не хранит
снимок diff (ответ на FE-OPEN-11 в PR #6): замечания публикуются inline у провайдера. Frontend
закладывает просмотр diff как допущение; откуда браузер получит diff — открытый вопрос к
backend. До его решения Diff Viewer работает только с mock adapter.

Не требуется заранее решать, будет ли backend отдавать готовый patch или структурированный
`DiffFile`: adapter может преобразовать любой из этих вариантов в модель ниже. Поэтому
компоненты не знают ни про `fetch`, ни про формат внешнего ответа.

## 2. Технические решения

| Задача                      | Решение                |
| --------------------------- | ---------------------- |
| Раскладка и локальные стили | Tailwind CSS v4        |
| Интерактивные элементы      | Ant Design             |
| Отображение diff            | `@git-diff-view/react` |
| Кэш данных adapter          | TanStack Query         |
| Общее UI-состояние          | Zustand                |
| Валидация входа adapter     | Zod                    |

Ant Design — единственный UI-kit для интерактивных контролов. Нельзя одновременно подключать
Headless UI или другой kit. Tailwind не дублирует компоненты Ant Design: им задают раскладку,
отступы и локальное оформление вокруг них. Ревизия 5.0 выбирала Headless UI; с ревизии 6.0
используется Ant Design: переключатель режима, чекбоксы фильтра, раскрывающаяся карточка
замечания, теги severity и состояния загрузки и ошибки есть в нём готовыми и доступными, без
собственной вёрстки поверх headless-примитивов.

`DiffViewer` — единственная обёртка над `@git-diff-view/react`. Библиотека даёт режимы split и
unified, подсветку синтаксиса и `extendData` — данные под строкой отдельно для старой и новой
стороны, ровно в форме `side` + `old_line` / `new_line` у finding. Она принимает текст unified
diff, поэтому `entities/diff/lib` переводит `DiffFile` в текст. Замена библиотеки затрагивает
только `DiffViewer`. Просмотрщик тянет подсветку и грузится отдельным чанком через `React.lazy`:
шапка и сводка его не ждут.

## 3. FSD: точное расположение

```text
src/
├── app/
│   ├── providers/                    # QueryClient, ErrorBoundary, TransportProvider
│   └── mocks/                        # конкретный mock adapter и фикстуры по умолчанию
├── pages/
│   └── review-run/
│       ├── ui/ReviewRunView.tsx      # экран: только композиция публичных widget API
│       ├── model/mockReview.ts       # MockReviewStateSchema и запрос экрана
│       └── index.ts
├── widgets/
│   ├── review-run-view/
│   │   ├── ui/RunHeader.tsx
│   │   ├── ui/ReviewSummary.tsx
│   │   └── index.ts
│   ├── review-workspace/
│   │   ├── ui/ReviewWorkspace.tsx
│   │   ├── ui/FileList.tsx
│   │   ├── ui/ViewModeToggle.tsx
│   │   ├── ui/DiffViewer.tsx         # обёртка над @git-diff-view/react
│   │   ├── model/store.ts
│   │   └── index.ts
│   └── run-inspector/
│       ├── ui/RunInspector.tsx
│       ├── ui/ActionTree.tsx
│       ├── ui/ActionDetails.tsx
│       ├── model/store.ts
│       └── index.ts
├── features/
│   └── filter-findings/
│       ├── ui/SeverityFilter.tsx
│       ├── model/store.ts
│       └── index.ts
├── entities/
│   ├── review-run/                   # model/, ui/ — бейджи статуса и verdict
│   ├── diff/                         # model/, lib/ — collapseContext, toUnifiedDiff
│   ├── review-finding/               # model/, lib/ — anchor, ui/ — ReviewCommentThread, SeverityBadge
│   ├── published-comment/            # model/
│   └── review-run-action/            # model/
└── shared/
    ├── api/                          # интерфейс adapter, TransportContext, useTransport и общая граница Zod
    ├── lib/                          # нейтральные утилиты
    └── ui/                           # повторно используемые простые UI-обёртки
```

Сегменты слайса — стандартные для FSD:

- `model/` — типы, Zod-схемы и store;
- `lib/` — чистые функции сущности или виджета;
- `ui/` — компоненты; в `entities` они только отображают сущность и не меняют данные, действия
  пользователя живут в `features`;
- `api/` — запросы, когда появится HTTP-клиент.

Наружу слайс отдаёт только `index.ts`.

Направление импортов строго одно: `app → pages → widgets → features → entities → shared`.
Слайс импортируется только через свой `index.ts`; внутренний файл соседнего слайса импортировать
нельзя. В частности:

- `shared/api` владеет интерфейсом adapter, `TransportContext` и `useTransport()`;
  `app/providers/TransportProvider` выбирает конкретный adapter и передаёт его в этот context.
  `ReviewRunView` не импортирует `app`;
- `pages/review-run` получает adapter через `useTransport()`, владеет запросом экрана и
  собирает публичные widget API;
- один widget не импортирует другой widget;
- `ReviewWorkspace` использует публичный `filter-findings`, но не владеет фильтром;
- `ReviewCommentThread` живёт в `entities/review-finding`: `DiffViewer` импортирует его через
  публичный API сущности;
- `ReviewRunView` находится в `pages`, не в `app`: это экран предметной области, а не корень
  приложения.

## 4. Данные и состояние

### 4.1 Mock-снимок

```ts
type MockReviewState = {
  run: ReviewRun
  files: DiffFileSummary[]
  diffs_by_path: Record<string, DiffFile>
  findings: ReviewFinding[]
  published_comments: PublishedComment[]
  actions: ReviewRunAction[]
}
```

`ReviewRun` содержит как минимум `id`, `status`, `head_sha`, `base_sha`, `failure_reason`,
`model`, `tokens_used`, `duration_seconds` и число отклонённых findings. `head_sha` и `base_sha`
— пара ревизий, между которыми считается diff прогона. `base_sha` может быть `null` у прогонов,
созданных до появления колонки: тогда шапка показывает только `head_sha`, а вместо diff
выводится сообщение, что базовая ревизия не сохранена.

Поддерживаются статусы: `queued`, `building_context`, `analysing`, `publishing`, `completed`,
`failed`, `cancelled`. `cancelled` — завершённый статус. Неизвестный будущий статус интерфейс
показывает как есть и считает незавершённым, а не падает.

`DiffFileSummary` содержит путь, статус файла, additions, deletions, число findings и признак
`is_binary`. `DiffFile` содержит путь, `is_binary` и hunks. У hunk есть стабильный `id`,
заголовок `@@ … @@` и упорядоченные строки.

`DiffLine` содержит стабильный `id`, вид строки (`context`, `removed`, `added`), номера
`old_line` и `new_line`, текст и признак `is_collapsed_context` для context, скрытого по
умолчанию.

`ReviewFinding` содержит `file_path`, `side`, номер строки на своей стороне, severity, category,
текст и suggestion при наличии. `PublishedComment` — отдельная сущность: она хранит факт и
статус публикации finding, а не заменяет finding. `ReviewRunAction` содержит `position`, tool,
status, время, duration, очищенные `request_preview` / `response_preview` и ошибку при наличии.
Неизвестный preview отображается безопасно как JSON, текст или пустое значение; полный payload
не загружается.

Поля вроде URL запроса на изменения, автора, веток, verdict и score допустимы только как
**явно помеченное mock-расширение**, пока их не согласовали с backend. Они не должны называться
контрактом API.

### 4.2 Один источник правды

TanStack Query хранит только `MockReviewState`, возвращённый adapter. Его нельзя копировать в
Zustand. Zustand хранит лишь действия пользователя:

| Store      | Поля                                                      | Владелец                   |
| ---------- | --------------------------------------------------------- | -------------------------- |
| workspace  | `selected_file`, `view_mode`, `expanded_context_line_ids` | `widgets/review-workspace` |
| фильтрация | `severity_filters`                                        | `features/filter-findings` |
| inspector  | `selected_action_id`                                      | `widgets/run-inspector`    |

Локальные hover, popover и фокус одной строки не попадают в Zustand. При refetch выбранный файл,
режим viewer, фильтры и раскрытый context сохраняются, если соответствующие данные всё ещё есть.

## 5. Компоненты и обязанности

```text
ReviewRunView (pages/review-run)
├── RunHeader (widgets/review-run-view)
├── ReviewSummary (widgets/review-run-view)
├── ReviewWorkspace (widgets/review-workspace)
│   ├── SeverityFilter (features/filter-findings)
│   ├── FileList
│   ├── ViewModeToggle
│   └── DiffViewer
│       └── @git-diff-view/react: hunks и строки
│           └── ReviewCommentThread (entities/review-finding) в виджете под строкой
└── RunInspector (widgets/run-inspector)
    ├── ActionTree
    └── ActionDetails
```

`DiffHunk` и `DiffLine` — модели и роли, а не собственные React-компоненты: их выполняет
библиотека внутри `DiffViewer`.

| Компонент                      | Что делает                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ReviewRunView`                | Через adapter из `useTransport()` показывает loading, error с повтором, empty и данные; композирует widgets.                          |
| `RunHeader`                    | Даёт статус доступным текстом; показывает `base_sha` и `head_sha`, `failure_reason`, когда он есть; не рисует `null`.                 |
| `ReviewSummary`                | Считает findings по severity, отклонённые findings и статусы публикации; finding вне diff показывает здесь.                           |
| `FileList`                     | Показывает все файлы, включая без findings; меняет только `selected_file`.                                                            |
| `SeverityFilter`               | Изменяет `severity_filters`, не владеет данными diff.                                                                                 |
| `ViewModeToggle`               | Переключает `view_mode` между unified и side-by-side.                                                                                 |
| `DiffViewer`                   | Рендерит ровно один выбранный `DiffFile` через библиотеку; кладёт findings и кнопки раскрытия context в виджеты под нужными строками. |
| `DiffHunk` (роль)              | Заголовок `@@` соответствует показанным строкам: если свёрнутый блок делит hunk, номера пересчитываются.                              |
| `DiffLine` (роль)              | Явно различает added/removed/context; findings получает только корректная строка.                                                     |
| `ReviewCommentThread`          | Показывает все findings строки, их severity, suggestion и статус публикации.                                                          |
| `RunInspector`                 | Показывает mock-хронологию действий; не требует готового backend endpoint.                                                            |
| `ActionTree` / `ActionDetails` | Сортируют по `position`, выбирают `selected_action_id`, показывают безопасные preview и ошибку.                                       |

## 6. Правила viewer

### 6.1 Unified

Строки выводятся в том порядке, в котором они идут в hunk. Вид строки различается не только
цветом, но и текстовым префиксом/доступным описанием.

### 6.2 Side-by-side

Удалённые и добавленные строки одного hunk сопоставляются по порядку. Если строк с одной стороны
больше, напротив остаётся пустая ячейка. Context выводится как общая строка. Переключение режима
не меняет `DiffFile`, findings или выбранный файл.

### 6.3 Свёрнутый context

Mock уже содержит скрытые строки: по нажатию UI только показывает их, без запроса к серверу. В
`expanded_context_line_ids` хранятся `id` строк раскрытого блока. `id` строк уникальны, поэтому
раскрытие блока в одном hunk никогда не раскрывает блок другого hunk. Повторное нажатие не
дублирует строки.

`collapseContext` объединяет соседние скрытые context-строки в один блок. Нажатие на его кнопку
атомарно добавляет в `expanded_context_line_ids` ID **всех** строк блока; повторное нажатие
удаляет их все. Так одно действие всегда раскрывает или скрывает цельный блок, хотя store
ключуется по ID строк, а не по отдельному `context_block_id`.

Кнопка раскрытия стоит под последней видимой строкой перед блоком, а если блок открывает hunk —
под первой строкой после него. Строка, к которой привязан finding, в свёрнутом блоке не
прячется.

### 6.4 Finding и anchor

Finding привязывается к `DiffLine`, только если одновременно совпали `file_path`, `side` и номер
**изменённой** строки своей стороны. Пример: finding с `side: 'old'` и номером `12` находится у
удалённой строки с `old_line: 12`, а не у добавленной строки с `new_line: 12`. Context-строка не
бывает anchor. Несколько findings на одной строке показываются все.

Backend отбрасывает finding с anchor вне diff (`validate_anchor`) и хранит только их число —
`rejected_findings`. Если такой finding всё же пришёл, это расхождение данных: он не исчезает
молча, а показывается в `ReviewSummary` как непривязанный.

### 6.5 Binary

Binary-файл остаётся выбранным, но вместо текстового diff показывает понятное сообщение. Viewer
не обращается к отсутствующему `diffs_by_path[path]` и не падает.

## 7. Минимум проверок реализации

Реализация следует `docs/testing/TEST_PLAN.md`. До мёржа реализации как минимум должны быть
проверены:

- четыре состояния adapter: loading, error, empty и данные;
- все семь статусов и безопасное неизвестное значение;
- прогон без `base_sha`: diff недоступен, экран не падает;
- выбор файла, severity-фильтр и сохранение UI-состояния при refetch;
- unified и side-by-side, в том числе лишняя строка с пустой парной ячейкой;
- заголовок hunk, независимый context-блок и binary-файл;
- finding на old/new строке, несколько findings одной строки, отсутствие finding на
  context-строке и finding вне diff;
- порядок действий `RunInspector`, выбор действия и безопасные preview.

Тесты спрашивают экран по роли и видимому тексту. Они не зависят от классов Tailwind,
внутренностей чужого слайса или вызовов `fetch`: подменяется adapter.

## 8. Изменения для реализации относительно ревизии 5.0

PR #19 построен по ревизии 5.0. Чтобы соответствовать этой ревизии, в нём меняется:

- **UI-kit.** Headless UI заменяется на Ant Design (§2): `@headlessui/react` удаляется,
  раскрывающаяся карточка замечания и остальные контролы переходят на компоненты Ant Design.
- **Место экрана.** `ReviewRunView` переезжает из `app` в `pages/review-run/ui`, а
  `MockReviewStateSchema` и запрос экрана — из `app/model` в `pages/review-run/model` (§3).
  Mock adapter и фикстуры остаются в `app/mocks`.

Остальное совпадает с реализацией PR #19: `@git-diff-view/react`, сегменты `lib/` и `ui/`,
`ReviewCommentThread` в `entities/review-finding`, `MockReviewState.run`, `base_sha`,
`expanded_context_line_ids` и правила раскрытия context.
