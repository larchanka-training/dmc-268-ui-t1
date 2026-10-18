# Proposal

## Why

Типы ответов API во фронте пишутся руками рядом с zod-схемами, а описание API живёт в бэкенде — `docs/openapi/openapi.json` в `dmc-268-api-t1`, его бэкенд экспортирует из кода FastAPI. Два описания одного контракта расходятся молча: бэкенд переименовал поле, фронт узнаёт об этом на стенде. Моки отвечают тем, что фронт сам придумал, и тоже не сверяются с бэкендом.

## What Changes

- Контракт бэкенда фиксируется по коммиту: sha в `src/shared/api/contract/VERSION`, сам `openapi.json` байт в байт рядом.
- Типы `paths`, `components`, `operations` генерируются `openapi-typescript` (точная версия в devDependencies) в `src/shared/api/contract/schema.d.ts`.
- `pnpm api:sync [<sha>]` записывает sha (без аргумента — голову `develop` бэкенда), скачивает контракт с `raw.githubusercontent.com` и перегенерирует типы; `pnpm api:check` сверяет закоммиченные контракт и типы со скачанным контрактом и свежей генерацией, проверяет, что sha входит в `develop` бэкенда, и падает при расхождении; если контракт в `develop` новее зафиксированного — только предупреждает.
- В CI `pnpm api:check` — шаг job'а `typecheck`.
- Сгенерированные файлы исключены из Prettier и ESLint: их правят только перегенерацией, и проверка побайтная.
- Правило в `AGENTS.md` и `.agents/rules/frontend.md`: тип ответа ручки из контракта руками не пишется; нужного поля или ручки нет — сначала PR в бэкенд с полем или роутом (запланированная ручка — заглушка с `501 NOT_IMPLEMENTED`), потом `pnpm api:sync`; фиксируется только коммит из `develop` бэкенда; моки отвечают по типам контракта. Раздел в README — как обновить контракт.

- Профиль (`UserResponse`) и находки прогона (`FindingResponse`) сверяются с контрактом при сборке: `MatchesContract<z.infer<typeof schema>, ApiSchemas['…']>` рядом с zod-схемой.
- Ошибки — как у бэкенда, по RFC 9457: мок `401` dev-сервера отвечает `application/problem+json` с телом `UnauthenticatedProblem`; `ApiError` берёт `code` и `detail` из problem-тела, `detail` становится текстом ошибки.

Остальные экраны и zod-схемы не переписываются: перевод их на типы контракта — отдельные изменения.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет.

`skip_specs: true`: меняются инструменты сборки и правила разработки, наблюдаемое поведение приложения прежнее.

## Impact

- Новые файлы: `scripts/api-contract.sh`, `src/shared/api/contract/{VERSION,openapi.json,schema.d.ts,index.ts}`.
- `package.json`, `pnpm-lock.yaml`: `openapi-typescript` и скрипты `api:sync`, `api:check`.
- `.github/workflows/ci.yml`: шаг `pnpm api:check` в job'е `typecheck`; job ходит в сеть к `raw.githubusercontent.com`.
- `.prettierignore`, `eslint.config.mjs`: исключены сгенерированные файлы.
- `src/build/mockAuth.ts`, `src/shared/api/{http,errors}.ts`: ошибки по RFC 9457.
- Стартовый sha — голова api PR #70, где контракт строится из кода; он ещё не в `develop`, поэтому `pnpm api:check` до мёржа PR #70 падает намеренно; после мёржа sha обновляется одной командой `pnpm api:sync`.
