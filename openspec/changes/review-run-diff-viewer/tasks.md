## 1. Основа

- [x] 1.1 Подключить `@tanstack/react-query`, `zustand`, `zod`, `react-router`, `@headlessui/react`, `@git-diff-view/react`
- [x] 1.2 `shared/api`: `ApiTransport`, `ApiError`, `parseResponse` с `ContractError`
- [x] 1.3 `shared/lib`: форматирование даты, длительности, sha
- [x] 1.4 `shared/ui`: `LoadingState`, `ErrorState`, `EmptyState`, `ErrorBoundary`, `TextWithCode`

## 2. Сущности

- [x] 2.1 `entities/review-run`: схема, `useReviewRun` с polling, `RunHeader`, `RunStatusBadge`, `VerdictBadge`
- [x] 2.4 Автор, ветки, вердикт и оценка в DTO прогона и моках
- [x] 2.2 `entities/diff`: схемы, `toUnifiedDiff`, `indexLines`, `useDiffFiles`, `useDiffFile`
- [x] 2.3 `entities/review-finding`: схемы, `groupFindingsByLine`, `useFindings`, `SeverityBadge`, `FindingCard`

## 3. Виджеты и страница

- [x] 3.1 `widgets/review-workspace`: стор выбора файла и режима, `FileList`, `ViewModeToggle`, `DiffViewer`, `ReviewWorkspace`
- [x] 3.2 `widgets/review-summary`: `ReviewSummary`
- [x] 3.3 `pages/review-run`: `ReviewRunPage`
- [x] 3.4 `app`: провайдеры, маршруты, mock adapter с фикстурами

## 4. Тесты

- [x] 4.1 Unit: форматтеры, схемы, `toUnifiedDiff`, `indexLines`, `groupFindingsByLine`, стор
- [x] 4.2 Компонентные: `FindingCard`, `TextWithCode`
- [x] 4.3 Интеграционные: `ReviewRunPage` с подменённым транспортом, включая polling
- [x] 4.4 Заменить smoke-тест счётчика `App`

## 5. Согласование

- [ ] 5.1 Подтвердить с бэкендом форму ответа `/findings`
- [ ] 5.2 Согласовать с бэкендом `merge_request`, `verdict`, `score` и правило расчёта оценки
- [ ] 5.4 Решить расхождение severity: в задаче Critical / Warning / Info, в контракте четыре уровня
- [ ] 5.3 Сверить фикстуры с API, когда эндпоинты появятся
