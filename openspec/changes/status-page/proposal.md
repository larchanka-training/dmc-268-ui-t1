# Proposal

## Why

Задача [api#299](https://github.com/larchanka-training/dmc-268-api-t1/issues/299) «Страница
статуса сервиса», фронтовая часть. Когда бот не пришёл в PR, пользователь не знает, сломано ли
что-то у него или у сервиса. Бэкенд отдаёт состояние API, воркера и очереди публичной ручкой
`GET /api/v1/status` (`getServiceStatus`, без сессии). Нужна страница, которая показывает его
и гостю, и вошедшему.

## What Changes

- Контракт обновлён до коммита бэкенда с ручкой `GET /api/v1/status` (`ServiceStatusResponse`,
  `ComponentStatusResponse`, `ServiceStatus`, `ServiceComponent`). Коммит из PR бэкенда:
  до мёржа бэкенда `pnpm api:check` не пропустит его в мёрж, после — `pnpm api:sync` с
  `develop`.
- Сущность `entities/service-status`: zod-схема ответа с `MatchesContract`, запрос, подписи
  состояний и компонентов, тег состояния, сведение ответа или ошибки запроса в вид страницы.
- Страница «Статус сервиса» по маршруту `/status` приложения (`/app/status`), вне
  `RequireAuth`: общее состояние, API, обработка ревью (воркер) и очередь задач словами
  «Работает», «Работает со сбоями», «Недоступен», «Нет данных», время проверки. Страница
  опрашивает статус раз в 30 секунд и при возврате на вкладку.
- Запрос статуса не удался — страница не пустеет: API «Недоступен», если он не ответил
  (сеть, `5xx`, `502` от nginx), воркер и очередь — «Нет данных», над ними — пояснение и кнопка
  «Проверить снова».
- Общий каркас публичных страниц `PublicLayout` в `widgets/app-shell`: шапка «Помощи»
  переезжает в него, «Статус сервиса» использует тот же.
- Ссылки: пункт «Статус сервиса» в боковом меню кабинета и ссылка на странице входа.
- nginx отдаёт HTML приложения на `/app/status` и `/app/status/` без cookie сессии, глубже —
  по-прежнему вход; `location /api/` cookie не проверяет, ручка статуса доходит до API и у
  гостя. Проверка маршрутов получила эти случаи.
- Mock adapter отвечает на `/status` по типу контракта.

**Не входит**: история инцидентов и аптайм, подписка на уведомления, ссылка на статус из
текста «Помощи», статус на лендинге.

## Capabilities

### New Capabilities

- `cabinet-status`: публичная страница статуса сервиса с опросом и запасным видом при сбое
  запроса.

### Modified Capabilities

- `frontend-delivery`: гость получает HTML приложения на `/app/status`.

## Impact

- Код: `src/entities/service-status/`, `src/pages/status/`, `src/widgets/app-shell/ui/PublicLayout.tsx`,
  `src/pages/HelpPage.tsx`, `src/app/router/AppRouter.tsx`, `src/widgets/app-shell/ui/AppSidebar.tsx`,
  `src/app/mocks/`, `login.html`, `src/styles/global.css`.
- Контракт: `src/shared/api/contract/` — `VERSION`, `openapi.json`, `schema.d.ts`.
- Доставка: `nginx/site.conf`, `scripts/check-routes.sh`.
- Зависимости: новых нет.
