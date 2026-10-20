# Tasks

## 1. Данные по контракту

- [x] 1.1 `ApiTransport.post`, HTTP-реализация с JSON-телом
- [x] 1.2 Репозитории: схемы и API по контракту, запросы через `useTransport`, страницы на полях контракта, `501` на подключении
- [x] 1.3 Прогон: `ReviewRunResponse`, ресурс дополнений, список замечаний без дополнений; `failed_stage` и `last_progress_at` как в контракте
- [x] 1.4 Mock adapter по путям контракта; `App` выбирает источник по `VITE_USE_MOCK_API`

## 2. Проверки

- [x] 2.1 Тесты экранов на подставном `ApiTransport`; тесты на HTTP-режим и экран без дополнений
- [x] 2.2 `typecheck`, `lint`, `format:check`, `test`, `build`, `api:check`, `openspec validate --strict`
