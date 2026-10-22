# Tasks

## 1. Данные

- [x] 1.1 `ReviewRunListResponseSchema`, `fetchReviewRunList`, `reviewRunListPath` в `entities/review-run`; `MatchesContract` с `ReviewRunListResponse`, параметры — тип `listReviews` из контракта
- [x] 1.2 `upsertRunListItem`: upsert по `id`, правило `updated_at`, порядок списка, `total`
- [x] 1.3 `501` не повторяется в `shouldRetry`

## 2. Вкладка

- [x] 2.1 Маршрут `/app/reviews` и пункт «Ревью» в меню
- [x] 2.2 Таблица с колонками, переход по строке, ссылка на PR у провайдера
- [x] 2.3 Поиск и фильтры в URL, разбор с значениями по умолчанию, сброс страницы при смене фильтра
- [x] 2.4 Пагинация по `total`, размер страницы в `page_size`
- [x] 2.5 Состояния: загрузка, ошибка с повтором, пусто, `501`

## 3. Поток

- [x] 3.1 `useRunListLiveUpdates`: одна подписка, upsert или перезапрос с троттлингом, перезапрос на `open`
- [x] 3.2 Незнакомые типы и события вне схемы не ломают страницу

## 4. Mock и тесты

- [x] 4.1 `GET /reviews` в mock adapter с фильтрами, пагинацией и `total`
- [x] 4.2 Тесты страницы (INT-24…INT-34), приложения на моке (INT-35), `upsertRunListItem`, `reviewRunListPath`, mock-списка
- [x] 4.3 Сценарии вкладки в `docs/testing/TEST_PLAN.md`

## 5. Проверки

- [x] 5.1 `typecheck`, `lint`, `stylelint`, `format:check`, `test`, `spec:validate`
- [ ] 5.2 Перед мёржем — `pnpm api:sync` на коммит из `develop` бэкенда
