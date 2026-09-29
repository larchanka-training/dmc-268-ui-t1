## 1. OpenSpec и ветка

- [x] 1.1 Создать change `cabinet-mock-oauth` (proposal, design, specs, tasks)
- [ ] 1.2 В PR указать `Closes #<issue>` по задаче команды

## 2. FSD-структура

- [x] 2.1 Перенести router в `src/app/router`, провайдеры в `src/app/providers`
- [x] 2.2 Вынести layout в `src/widgets/app-shell` с публичным `index.ts`
- [x] 2.3 Перенести auth/theme в `src/features/*` с публичными `index.ts`
- [x] 2.4 Перенести session/repository в `src/entities/*`, mock API за границей entity
- [x] 2.5 Обновить импорты и alias `@/` во всём кабинете

## 3. Auth и границы данных

- [x] 3.1 Реализовать `parseAuthSession(unknown)` и использовать в `loadSession`
- [x] 3.2 Тесты на битые записи в storage (блокер ревью PR #16)

## 4. Репозитории и Query

- [x] 4.1 Добавить `@tanstack/react-query` и `QueryClientProvider`
- [x] 4.2 Queries для подключённых и доступных репозиториев
- [x] 4.3 Mutation подключения с инвалидацией кэша

## 5. Тесты и проверки

- [x] 5.1 Обновить smoke-тест `App`
- [x] 5.2 Тесты `RequireAuth` и OAuth state (минимум)
- [x] 5.3 `pnpm test`, `pnpm build`, `pnpm lint`

## 6. Слияние

- [x] 6.1 Слить ветку с доработками в `feat/cabinet`
