## Purpose

Каркас кабинета: провайдеры, маршрутизация в слое `app`, layout и тема.

## ADDED Requirements

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
