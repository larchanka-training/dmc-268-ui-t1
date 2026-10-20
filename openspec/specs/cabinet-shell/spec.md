# cabinet-shell Specification

## Purpose

Каркас кабинета: провайдеры, маршрутизация в слое `app`, layout и тема.

## Requirements

### Requirement: Application routing in app layer

Route definitions SHALL live under `src/app/router` and SHALL compose page components from the `pages` layer without business logic in the router module.

#### Scenario: Anonymous user opens root

- **WHEN** an unauthenticated user navigates to `/`
- **THEN** the application SHALL redirect to `/login`

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

### Requirement: Источник данных кабинета

Экраны кабинета SHALL получать данные только через `ApiTransport` и `EventStream`. Приложение SHALL по умолчанию собирать mock adapter и сценарный поток событий, а с `VITE_USE_MOCK_API=false` — HTTP-клиент к `/api/v1` и поток на `EventSource`. Переход экрана с мока на бэкенд SHALL NOT требовать правки экрана.

#### Scenario: Данные с бэкенда

- **WHEN** приложение собрано с `VITE_USE_MOCK_API=false` и пользователь открывает `/repositories`
- **THEN** список запрашивается у бэкенда `GET /api/v1/repositories`

#### Scenario: Данные из мока

- **WHEN** `VITE_USE_MOCK_API` не задан
- **THEN** экраны получают данные из mock adapter по путям и формам контракта
