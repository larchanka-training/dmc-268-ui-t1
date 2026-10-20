# Proposal

## Why

В `develop` бэкенда влит api#63: в контракте у находки появилось поле `rule` (пункт `.review/rules.md`), у прогона — `verification` и `verifier_dropped_findings` (итог второго прохода модели). Зафиксированный во фронте контракт (`9cd45a4`) их не знает, а схемы ответа сверяются с контрактом при сборке.

## What Changes

- `pnpm api:sync` на голову `develop` бэкенда (`52f07a5`).
- `ReviewFindingSchema` — `rule` (`name`, `check`, `check_text` или `null`); `ReviewRunSchema` — `verification` и `verifier_dropped_findings`. Фикстуры мока и фабрики тестов — с новыми полями.
- Экран прогона новые поля пока не показывает.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет: видимое поведение не меняется. `skip_specs: true`.

## Impact

- `src/shared/api/contract`, `src/entities/review-finding`, `src/entities/review-run`, `src/app/mocks/fixtures.ts`, `src/test/factories.ts`.
