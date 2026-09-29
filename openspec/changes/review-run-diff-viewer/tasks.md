## 1. Основа

- [x] 1.1 Подключить `@tanstack/react-query`, `zustand`, `zod`, `@headlessui/react`, `@git-diff-view/react`
- [x] 1.2 `shared/api`: `ApiTransport`, `ApiError`, `parseResponse` с `ContractError`
- [x] 1.3 `shared/lib`: форматирование даты, длительности, sha, безопасная внешняя ссылка
- [x] 1.4 `shared/ui`: `LoadingState`, `ErrorState`, `EmptyState`, `ErrorBoundary`, `TextWithCode`

## 2. Сущности

- [x] 2.1 `entities/review-run`: схема с расширениями ТЗ, `RunStatusBadge`, `VerdictBadge`
- [x] 2.2 `entities/diff`: схемы с `id` и `is_collapsed_context`, `toUnifiedDiff`, `indexLines`, `collapseContext`
- [x] 2.3 `entities/review-finding`: схема, `groupFindingsByLine`, `SeverityBadge`, `ReviewCommentThread`
- [x] 2.4 `entities/published-comment` и `entities/review-run-action`: схемы

## 3. Фичи и виджеты

- [x] 3.1 `features/filter-findings`: `severity_filters` и `SeverityFilter`
- [x] 3.2 `widgets/review-run-view`: `RunHeader`, `ReviewSummary`
- [x] 3.3 `widgets/review-workspace`: стор, `FileList`, `ViewModeToggle`, `DiffViewer`, `ReviewWorkspace`
- [x] 3.4 `widgets/run-inspector`: стор, `ActionTree`, `ActionDetails`, `RunInspector`
- [x] 3.5 `app`: провайдеры, `MockReviewState` и `['mock-review']`, `ReviewRunView`, mock adapter с фикстурами

## 4. Тесты

- [x] 4.1 Unit: форматтеры, схемы, `toUnifiedDiff`, `indexLines`, `collapseContext`, `groupFindingsByLine`, сторы
- [x] 4.2 Компонентные: `ReviewCommentThread`, `TextWithCode`
- [x] 4.3 Интеграционные: `ReviewRunView` с подменённым adapter — INT-01…INT-08, раскрытие контекста, фильтр, `RunInspector`
- [x] 4.4 Заменить smoke-тест счётчика `App`

## 5. Согласование

- [ ] 5.1 Согласовать с бэкендом `merge_request`, `verdict`, `score`, `change_request` и правило расчёта оценки
- [ ] 5.2 Решить расхождение severity: в задаче Critical / Warning / Info, в модели четыре уровня
- [ ] 5.3 Предложить в #6 перенести композицию `ReviewRunView` из `widgets` или разрешить её явно
- [ ] 5.4 Сверить фикстуры с API, когда появится browser-контракт
