## Purpose

Список подключённых репозиториев и подключение новых (mock) через серверный слой данных.

## ADDED Requirements

### Requirement: Server state via TanStack Query

Repository lists and connect actions SHALL use TanStack Query (queries and mutations), not ad-hoc `useState`/`useEffect` data fetching in page components.

#### Scenario: Connected repositories list

- **WHEN** an authenticated user opens `/repositories`
- **THEN** the application SHALL show a loading state
- **AND** SHALL display connected repositories from the mock adapter

#### Scenario: Connect repository

- **WHEN** the user connects an available repository on `/repositories/connect`
- **THEN** the application SHALL call a mutation
- **AND** SHALL refresh connected list data after success

### Requirement: Filter available repositories

The connect page SHALL allow filtering available repositories by name (client-side filter on query data).
