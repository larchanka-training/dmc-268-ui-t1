## 1. Контракт

- [x] 1.1 `pnpm api:sync` с головы `develop` бэкенда; `pnpm run typecheck` и `pnpm api:check` зелёные

## 2. Причина ошибки диффа

- [x] 2.1 `useReviewDiff` не считает `404`/`501` отсутствием диффа; `diffProblem.ts` сопоставляет `code` с заголовком и признаком постоянной ошибки
- [x] 2.2 `ReviewRunView` показывает причину над списком замечаний: постоянные — без «Повторить», остальные — «Не удалось загрузить дифф» с «Повторить»; тесты `ReviewRunView.test.tsx` на каждый `code`, один запрос диффа при `409`/`410`/`422`, повтор после `502`
- [x] 2.3 `useReviewDiff` ждёт `base_sha` (`enabled: base_sha != null`): прогон в очереди не показывает «Дифф прогона недоступен»; тесты на `queued` без `base_sha` и на появление диффа после `run.finished`
- [x] 2.4 `usePlannedPart` встроен в `useReviewSteps` — единственный вызов; `501` у шагов по-прежнему скрывает блок (снято в ui#125)

## 3. Приложение без mock adapter

- [x] 3.1 `App.tsx` собирает только HTTP-клиент и `EventSource`; `USE_MOCK_API` и `VITE_USE_MOCK_API` убраны из `src/shared/config/env.ts` и `src/vite-env.d.ts`
- [x] 3.2 `App.test.tsx` на `stubFetch`, `fakeTransport` и `createFakeEventStream`: маршруты, глубокие ссылки и сценарий прогона (одна подписка, перезапрос после `run.finished`, сбой с этапом и причиной, статус строки списка из потока); `sessionApi.test.ts` на `ME`
- [x] 3.3 Удалить `src/app/mocks/`; `pnpm run test` зелёный

## 4. Dev-сервер без мока входа

- [x] 4.1 `vite.config.ts`: без плагина `mockAuth`, прокси `/api` на `VITE_API_PROXY_TARGET` всегда; удалить `src/build/mockAuth.ts` и его тест; `pnpm run build` зелёный

## 5. Сборка, CI, доставка

- [x] 5.1 `Dockerfile`, `ci.yml` (job `image`: build-arg, шаг «Мока входа нет в образе», комментарий), `deploy.yml` (тег — только sha, без build-arg); фикстуры тегов в `.github/tests/deploy-report.test.mjs` и `infra/tests/main.tftest.hcl`; `grep VITE_USE_MOCK_API` по репозиторию пуст
- [ ] 5.2 После мёржа в `develop`: `gh variable delete VITE_USE_MOCK_API`, `gh variable list` её не показывает

## 6. Документация

- [x] 6.1 README: раздел кабинета без мока, таблица переменных, локальный запуск против бэкенда (`make run-local`, своя GitHub App, `PUBLIC_ORIGIN`, callback) и почему не стенд
- [x] 6.2 `docs/testing/TEST_PLAN.md` §4 и `FRONTEND_ARCHITECTURE.md` — фейк транспорта вместо `app/mocks`
- [x] 6.3 Правила агентов без моков: `.agents/rules/frontend.md` (состояние, контракт API), `AGENTS.md`, скилл `frontend-tdd`, шаблон `.agents/templates/frontend/query.md`, комментарии в `nginx/site.conf` и `src/shared/api/eventStream.ts`

## 7. Проверка

- [x] 7.1 Все гейты: `typecheck`, `lint`, `stylelint`, `format:check`, `test`, `api:check`, `openspec validate cabinet-without-mocks --strict`
- [ ] 7.2 Локально против бэкенда: вход, репозитории, настройки, прогон, выход

## 8. Архив

- [ ] 8.1 После архива `review-run-diff-viewer` и `session-cookie` — `openspec archive cabinet-without-mocks` (#130)
- [ ] 8.2 При архиве — Purpose `openspec/specs/cabinet-auth/spec.md`: вход через бэкенд и cookie сессии вместо «Mock OAuth… до готовности бэкенда» (дельтой Purpose не меняется)
