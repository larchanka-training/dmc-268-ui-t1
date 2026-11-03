## 1. Контракт

- [ ] 1.1 `pnpm api:sync` с головы `develop` бэкенда; `pnpm run typecheck` и `pnpm api:check` зелёные

## 2. Причина ошибки диффа

- [ ] 2.1 `useReviewDiff` не считает `404`/`501` отсутствием диффа; `diffProblem.ts` сопоставляет `code` с заголовком и признаком постоянной ошибки
- [ ] 2.2 `ReviewRunView` показывает причину над списком замечаний: постоянные — без «Повторить», остальные — «Не удалось загрузить дифф» с «Повторить»; тесты `ReviewRunView.test.tsx` на каждый `code`, один запрос диффа при `409`/`410`/`422`, повтор после `502`

## 3. Приложение без mock adapter

- [ ] 3.1 `App.tsx` собирает только HTTP-клиент и `EventSource`; `USE_MOCK_API` и `VITE_USE_MOCK_API` убраны из `src/shared/config/env.ts` и `src/vite-env.d.ts`
- [ ] 3.2 `App.test.tsx` на `stubFetch`, `fakeTransport` и `createFakeEventStream`: маршруты, глубокие ссылки и сценарий прогона (одна подписка, перезапрос после `run.finished`, сбой с этапом и причиной, статус строки списка из потока); `sessionApi.test.ts` на `ME`
- [ ] 3.3 Удалить `src/app/mocks/`; `pnpm run test` зелёный

## 4. Dev-сервер без мока входа

- [ ] 4.1 `vite.config.ts`: без плагина `mockAuth`, прокси `/api` на `VITE_API_PROXY_TARGET` всегда; удалить `src/build/mockAuth.ts` и его тест; `pnpm run build` зелёный

## 5. Сборка, CI, доставка

- [ ] 5.1 `Dockerfile`, `ci.yml` (job `image`: build-arg, шаг «Мока входа нет в образе», комментарий), `deploy.yml` (тег — только sha, без build-arg); фикстуры тегов в `.github/tests/deploy-report.test.mjs` и `infra/tests/main.tftest.hcl`; `grep VITE_USE_MOCK_API` по репозиторию пуст
- [ ] 5.2 После мёржа в `develop`: `gh variable delete VITE_USE_MOCK_API`, `gh variable list` её не показывает

## 6. Документация

- [ ] 6.1 README: раздел кабинета без мока, таблица переменных, локальный запуск против бэкенда (`make run-local`, своя GitHub App, `PUBLIC_ORIGIN`, callback) и почему не стенд
- [ ] 6.2 `docs/testing/TEST_PLAN.md` §4 и `FRONTEND_ARCHITECTURE.md` — фейк транспорта вместо `app/mocks`

## 7. Проверка

- [ ] 7.1 Все гейты: `typecheck`, `lint`, `stylelint`, `format:check`, `test`, `api:check`, `openspec validate cabinet-without-mocks --strict`
- [ ] 7.2 Локально против бэкенда: вход, репозитории, настройки, прогон, выход
