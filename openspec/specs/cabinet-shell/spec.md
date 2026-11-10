# cabinet-shell Specification

## Purpose

Каркас кабинета: провайдеры, маршрутизация в слое `app`, layout и тема.

## Requirements

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

### Requirement: App shell layout

Authenticated users SHALL see a shell with sidebar navigation, header (user, provider, sign out), and theme toggle.

#### Scenario: Theme toggle

- **WHEN** the user toggles theme in the header
- **THEN** the UI SHALL switch between light and dark modes
- **AND** the choice SHALL persist across reloads

### Requirement: Russian UI copy

All user-visible strings in the cabinet SHALL be in Russian.

#### Scenario: Login screen language

- **WHEN** an anonymous user opens `/login`
- **THEN** primary actions and descriptions SHALL be displayed in Russian

### Requirement: Данные кабинета с бэкенда

Экраны кабинета SHALL получать данные только через `ApiTransport` и `EventStream`. Приложение SHALL собирать HTTP-клиент к `/api/v1` и поток на `EventSource` и SHALL NOT содержать мок транспорта, сценарный поток событий или флаг сборки, выбирающий источник данных. Тесты экранов SHALL подменять `ApiTransport` и `EventStream` фейком, а не собирать мок транспорта в приложении.

#### Scenario: Данные с бэкенда

- **WHEN** пользователь открывает `/repositories`
- **THEN** список запрашивается у бэкенда `GET /api/v1/repositories`

#### Scenario: Сборка без мока

- **WHEN** приложение собрано для стенда или локально
- **THEN** в бандле нет мока транспорта, фикстур и мока входа, а источник данных не зависит от переменных сборки
