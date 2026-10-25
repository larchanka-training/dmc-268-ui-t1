# Proposal

## Why

Даты в интерфейсе форматируются двумя способами: экран прогона — `formatDateTime` из `shared/lib` на `Intl` в UTC, список репозиториев — `dayjs` в локальном поясе. Время одного и того же события на разных экранах расходится.

## What Changes

- Все даты — через `formatDateTime` из `shared/lib` на `Intl`; пояс один на всё приложение.
- `dayjs` убирается из зависимостей и из `main.tsx`.
- ESLint запрещает импорт библиотек дат (`no-restricted-imports`); правило — в `.agents/rules/frontend.md`.

## Capabilities

### Modified Capabilities

- `code-quality`: даты и числа — только через `Intl` и общий форматтер, линтер это проверяет.

## Impact

- `src/pages/RepositoriesPage.tsx`, `src/main.tsx`, `package.json`, `eslint.config.mjs`, `.agents/rules/frontend.md`.
