# Proposal

## Why

После dmc-268-api-t1#335 ни одна ручка, которую вызывает кабинет, не отвечает `501 NOT_IMPLEMENTED`. Ветки для `501` в настройках репозитория и в ходе прогона стали мёртвым кодом, а спеки по-прежнему их требуют. Задача ui#125.

## What Changes

- Настройки и статус правил больше не показывают «пока недоступно» на `501`: `NotImplementedNote` и `isNotImplemented` удалены.
- `useReviewSteps` не превращает `501` в «шагов нет»: любой отказ `GET /steps` показывается ошибкой «Не удалось загрузить ход прогона».
- `shouldRetry` не меняется: `501` автоматически не повторяется, это верно по HTTP вообще.
- Дельта `review-run-view` в незаархивированном `cabinet-without-mocks` тоже без `501` у шагов, иначе его архив вернёт требование.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `review-run-view`: `501` у шагов больше не скрывает «Ход прогона»; из правила про дифф снято «кроме `404` и `501`», любой отказ диффа уже показывается ошибкой (ui#121).
- `cabinet-repository-settings`: снято требование «пока недоступно» для ручек-заглушек.

## Impact

- `src/pages/RepositorySettingsPage.tsx`, `src/shared/api/errors.ts`, `src/pages/review-run/model/review.ts` и их тесты.
- `docs/testing/TEST_PLAN.md`: снят INT-33 про `501` у `GET /reviews`, такой ветки в коде нет.
