# Tasks

## 1. Контракт и данные

- [x] 1.1 Контракт с коммита PR бэкенда `6fbe31e` (`GET /api/v1/status`): `VERSION`, `openapi.json` байт в байт, `schema.d.ts` той же генерацией, что `pnpm api:sync`
- [ ] 1.2 После мёржа бэкенда — `pnpm api:sync` с головы `develop`, `pnpm api:check` зелёный
- [x] 1.3 `entities/service-status`: схема ответа с `MatchesContract`, `fetchServiceStatus`, подписи, `ServiceStatusTag`, `viewFromReport`, `viewFromFailure`, `worstStatus`
- [x] 1.4 Mock adapter: `/status` по типу `ServiceStatusResponse`

## 2. Страница

- [x] 2.1 `pages/status`: общее состояние, три компонента, «Проверено», загрузка, сбой запроса с «Проверить снова»; опрос раз в 30 с и при возврате на вкладку
- [x] 2.2 `PublicLayout` в `widgets/app-shell`, «Помощь» на нём; маршрут `/status` вне `RequireAuth`
- [x] 2.3 Пункт «Статус сервиса» в `AppSidebar`, ссылка в `login.html`

## 3. Доставка

- [x] 3.1 `nginx/site.conf`: `location ~ ^/app/(help|status)/?$`; `scripts/check-routes.sh`: гость получает `200` и заголовки безопасности на `/app/status` и `/app/status/`, `/app/status/x` и `/app/statusx` уводят на вход
- [ ] 3.2 На стенде гость открывает `/app/status`, а `GET /api/v1/status` без cookie отвечает `200`
- [ ] 3.3 На стенде при остановленном контейнере API страница показывает API «Недоступен», воркер и очередь — «Нет данных»

## 4. Тесты

- [x] 4.1 Unit: `worstStatus`, `viewFromReport`, `viewFromFailure`; разбор ответа — незнакомое состояние, незнакомый компонент, ответ без `checked_at`
- [x] 4.2 `StatusPage.test.tsx`: загрузка, каждое состояние словом, разные состояния компонентов и время проверки, сбой сети и `502`, «Проверить снова», опрос раз в 30 с, перезапрос при возврате на вкладку, сбой опроса после удачного ответа, гость без запроса профиля, ссылка со страницы входа
- [x] 4.3 Пункт меню в `AppSidebar.test.tsx`, `/status` в тесте mock adapter
