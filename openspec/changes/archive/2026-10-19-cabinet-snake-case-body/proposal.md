# Proposal

## Why

Бэкенд перевёл поля API на один стиль — snake_case (api#86, решение 6 в #37): тело `POST /api/v1/repositories` теперь `{provider, provider_id}`.

## What Changes

- Контракт синхронизирован с `develop` бэкенда (9cd45a4); тело подключения — `provider_id`.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `cabinet-repositories`: тело подключения — `{provider, provider_id}`.

## Impact

- `src/shared/api/contract/*`, `src/pages/ConnectRepositoryPage.tsx`, `src/app/mocks/repositories.ts`, тесты подключения и HTTP-транспорта.
