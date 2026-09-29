# Proposal

## Why

В интерфейсе пока только стартовый счётчик. Задача спринта для Инженера 2 (#18) — экран прогона ревью: метаданные, Diff Viewer в двух режимах и замечания AI прямо под строками, к которым они относятся. Definition of Done: страница показывает файлы диффа, а под строками с замечаниями корректно рендерятся раскрывающиеся карточки.

Структура, модели и состояние следуют `FRONTEND_ARCHITECTURE.md` ревизии 5.0 (PR #6): FSD, один mock adapter, Zod-валидация, `ReviewRunView` с `RunHeader`, `ReviewSummary`, `ReviewWorkspace` и `RunInspector`.

## What Changes

- Экран одного прогона `ReviewRunView` на mock adapter: данные — одним запросом `['mock-review']` в форме `MockReviewState` (§8.1 архитектуры).
- `RunHeader`: название запроса на изменения, автор, ветки, вердикт и общая оценка, статус, коммит, запуск, время, длительность, модель, токены, причина сбоя, ссылка на источник.
- `ReviewSummary`: число замечаний по severity, опубликованные inline-комментарии, отброшенные валидацией, замечания без привязки к строке, предупреждение о неполном результате у `failed` и `cancelled`.
- `ReviewWorkspace`: список изменённых файлов и дифф одного выбранного файла в режиме side-by-side или unified с подсветкой синтаксиса, свёрнутый контекст с раскрытием, фильтр замечаний по severity.
- `ReviewCommentThread`: раскрывающаяся карточка замечания с severity, категорией, текстом, блоком предлагаемого кода и статусом публикации.
- `RunInspector`: хронология mock-действий worker по `position` и очищенные preview выбранного действия.
- Подключаются библиотеки, принятые в архитектуре: TanStack Query, Zustand, Zod, Headless UI, а также `@git-diff-view/react` для отображения диффа.
- **BREAKING** для спеки `testing`: smoke-тест счётчика `App` заменяется интеграционным тестом `ReviewRunView` — счётчика больше нет.

**Не входит** (§1.3 архитектуры): маршруты, HTTP-клиент, механизм обновления прогона, интеграция с Git-хостингом, авторизация.

## Capabilities

### New Capabilities

- `review-run-view`: просмотр одного прогона ревью — метаданные, сводка, дифф файлов со свёрнутым контекстом, inline-замечания AI, фильтр по severity и хронология действий.

### Modified Capabilities

- `testing`: smoke-тест `App` со счётчиком заменяется интеграционным тестом `ReviewRunView`.

## Impact

- Код: `src/app`, `src/widgets/{review-run-view,review-workspace,run-inspector}`, `src/features/filter-findings`, `src/entities/{review-run,diff,review-finding,published-comment,review-run-action}`, `src/shared/{api,lib,ui}`. Удалены `src/App.tsx` и `src/App.test.tsx`.
- Зависимости: `@git-diff-view/react`, `@tanstack/react-query`, `zustand`, `zod`, `@headlessui/react`.
- Бандл: просмотрщик диффа тянет подсветку всех языков highlight.js (~340 КБ gzip) и грузится отдельным чанком; основной чанк ~124 КБ gzip.
- Бэкенду: в `ReviewRun` фронтенд добавляет `merge_request` (название, автор, ветки), `verdict`, `score` и `change_request` — их нет в §8.2, в моках они есть; нужно согласовать. Browser-контракта диффа и действий пока нет (FE-CON-05, FE-CON-06).
