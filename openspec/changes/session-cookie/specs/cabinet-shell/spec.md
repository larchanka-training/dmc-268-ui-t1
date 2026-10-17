## MODIFIED Requirements

### Requirement: Application routing in app layer

Маршруты SHALL жить в `src/app/router` и SHALL собирать страницы слоя `pages` без бизнес-логики в модуле роутера. Роутер SHALL работать под `basename="/app"`: адреса кабинета — `/app/`, `/app/repositories`, `/app/reviews/{id}`. Маршрутов `/login` и `/oauth/callback` в SPA SHALL NOT быть.

#### Scenario: Anonymous user opens root

- **WHEN** пользователь без сессии открывает `/app/`
- **THEN** браузер оказывается на `/login?redirect=/app/`

#### Scenario: Экран прогона требует сессию

- **WHEN** пользователь без сессии открывает `/app/reviews/42`
- **THEN** браузер оказывается на `/login?redirect=/app/reviews/42`

#### Scenario: Глубокая ссылка

- **WHEN** пользователь с сессией открывает `/app/repositories`
- **THEN** открывается экран репозиториев

#### Scenario: Неизвестный адрес под `/app`

- **WHEN** пользователь открывает `/app/unknown`
- **THEN** приложение уводит на `/app/`
