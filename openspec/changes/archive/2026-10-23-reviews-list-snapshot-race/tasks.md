# Tasks

## 1. Гонка снимка и события

- [x] 1.1 `mergeRunListSnapshot` в `entities/review-run` и `structuralSharing` запроса страницы
- [x] 1.2 Буфер событий, пришедших за время загрузки страницы в режиме upsert, — наложение на снимок после успешного ответа
- [x] 1.3 Режим upsert по ключу запроса: без фильтров и `offset` 0
- [x] 1.4 Тесты: перезапрос после `open` и `run.status_changed`, то же с `run.created`, переход на первую страницу без данных под ключом

## 2. Фильтр репозиториев

- [x] 2.1 `repository_id` из URL — только uuid, не больше 50; в URL — не больше 50; `maxCount` в фильтре
- [x] 2.2 Моки и фабрики с uuid репозиториев

## 3. Прочее

- [x] 3.1 Тест: одна подписка при смене фильтра и страницы, ноль после ухода
- [x] 3.2 `ApiOperations` из `shared/api/contract/index.ts`
- [x] 3.3 `typecheck`, `lint`, `stylelint`, `format:check`, `test`, `spec:validate`, `api:check`, `build`
