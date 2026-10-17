## REMOVED Requirements

### Requirement: Mock OAuth login

**Reason**: OAuth выполняет бэкенд (api#47), вход — статичная страница `/login` (#25); у SPA нет ни экрана входа, ни callback.

**Migration**: вход — ссылка на `/login?redirect=<путь>`; мок сессии — cookie `session` с любым значением в dev-сервере.

### Requirement: Persisted session validation

**Reason**: токенов и профиля в `localStorage` больше нет: сессия — httpOnly cookie, профиль приходит из `GET /api/v1/auth/me`.

**Migration**: не нужна — ключи `localStorage` от #16 приложение больше не читает.

## MODIFIED Requirements

### Requirement: Protected routes

Маршруты кабинета SHALL открываться только пользователю с действительной сессией. Сессию SHALL проверять запрос `GET /api/v1/auth/me`; ответ `401` на него или на любой другой запрос к API SHALL переводить браузер на статичную `/login?redirect=<путь>`, где путь — текущий адрес под `/app/`.

#### Scenario: Anonymous user opens a cabinet route

- **WHEN** пользователь без сессии открывает `/app/repositories`
- **THEN** браузер оказывается на `/login?redirect=/app/repositories`

#### Scenario: Сессия истекла посреди работы

- **WHEN** пользователь на `/app/repositories` и очередной запрос к API получил `401`
- **THEN** браузер переходит на `/login?redirect=/app/repositories`

#### Scenario: Экран прогона

- **WHEN** пользователь без сессии открывает `/app/reviews/42`
- **THEN** браузер оказывается на `/login?redirect=/app/reviews/42`

#### Scenario: Выход в другой вкладке

- **WHEN** пользователь вернулся во вкладку кабинета, а сессия закончилась в другой вкладке
- **THEN** профиль перезапрашивается, получает `401`, и браузер переходит на `/login?redirect=<путь>`

#### Scenario: Ответ 403 не означает потерю сессии

- **WHEN** запрос к API получил `403` с кодом `ORIGIN_FORBIDDEN`
- **THEN** браузер остаётся на экране, ошибка несёт код ответа

#### Scenario: Пользователь с сессией

- **WHEN** `GET /api/v1/auth/me` ответил `200`
- **THEN** кабинет открывается, в шапке — логин и аватар пользователя

## ADDED Requirements

### Requirement: Профиль из сессии на бэкенде

Профиль пользователя SHALL приходить из `GET /api/v1/auth/me` как `unknown`, SHALL проверяться схемой перед использованием и SHALL жить в кэше TanStack Query, а не в `localStorage` или store. Ответ вне схемы SHALL считаться ошибкой контракта, а не входом.

#### Scenario: Ответ без логина

- **WHEN** `GET /api/v1/auth/me` вернул `200` без поля `login`
- **THEN** кабинет показывает ошибку загрузки, а не пустой профиль

#### Scenario: Профиль без имени и аватара

- **WHEN** `GET /api/v1/auth/me` вернул `name` и `avatar_url` равными `null` или пустой строке
- **THEN** приветствие на обзоре показывает логин, а в шапке вместо аватара — первая буква логина

### Requirement: Запросы к API несут cookie сессии

Каждый запрос к API SHALL отправляться с `credentials: 'include'` и SHALL NOT нести заголовок `Authorization`. Ни один токен SHALL NOT храниться в JS.

Все запросы к API, включая HTTP-реализацию транспорта данных, SHALL идти через общий `apiFetch`, чтобы обработка `401` не обходилась.

#### Scenario: Запрос данных кабинета

- **WHEN** кабинет запрашивает данные у API
- **THEN** запрос идёт с cookie сессии и без `Authorization`

### Requirement: Выход

Выход SHALL отправлять `POST /api/v1/auth/logout` и после ответа SHALL переводить браузер на `/`. Сбой запроса, включая `401` и `403`, SHALL NOT оставлять пользователя в кабинете: переход на `/` выполняется и тогда, ровно один, без промежуточного `/login`.

#### Scenario: Выход из шапки

- **WHEN** пользователь нажал «Выйти»
- **THEN** уходит `POST /api/v1/auth/logout`, затем открывается `/`

#### Scenario: Сессия уже закончилась

- **WHEN** `POST /api/v1/auth/logout` ответил `401`
- **THEN** открывается `/`, перехода на `/login` не было

### Requirement: Мок сессии в dev-сервере

В режиме разработки dev-сервер Vite SHALL отвечать на `GET /api/v1/auth/me` профилем-заглушкой при наличии cookie `session` и `401` без неё, а на `POST /api/v1/auth/logout` — `204` с удалением cookie. Код экранов SHALL NOT знать, работает ли он с моком.

#### Scenario: Локальный запуск без cookie

- **WHEN** разработчик открыл `/app/` в dev-сервере без cookie `session`
- **THEN** `GET /api/v1/auth/me` отвечает `401`, и приложение уводит на `/login`
