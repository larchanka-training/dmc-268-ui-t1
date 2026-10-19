# cabinet-repositories Specification

## Purpose

Список подключённых репозиториев и подключение новых (mock) через серверный слой данных.

## Requirements

### Requirement: Server state via TanStack Query

Списки репозиториев и подключение SHALL использовать TanStack Query (запросы и мутации) поверх `ApiTransport`, а не прямую загрузку данных в компонентах страниц. Пути и формы ответов SHALL соответствовать контракту бэкенда: подключённые — `GET /api/v1/repositories`, доступные — `GET /api/v1/repositories/available`, подключение — `POST /api/v1/repositories` с телом `{provider, providerId}`.

#### Scenario: Connected repositories list

- **WHEN** вошедший пользователь открывает `/repositories`
- **THEN** приложение SHALL показать состояние загрузки
- **AND** SHALL показать подключённые репозитории из `GET /api/v1/repositories`: имя, ветку по умолчанию, провайдера, включено ли автоматическое ревью, дату подключения

#### Scenario: Connect repository

- **WHEN** пользователь подключает доступный репозиторий на `/repositories/connect`
- **THEN** приложение SHALL вызвать мутацию `POST /api/v1/repositories`
- **AND** SHALL обновить список подключённых после успеха

### Requirement: Filter available repositories

The connect page SHALL allow filtering available repositories by name (client-side filter on query data).

#### Scenario: Filter by part of the name

- **WHEN** the user types `Front` in the search field on `/repositories/connect`
- **THEN** the list SHALL show only repositories whose full name contains `front`, case-insensitive
- **AND** clearing the field SHALL show all available repositories again

### Requirement: Подключение, которое бэкенд ещё не реализовал

Если ручки подключения отвечают `501` с `code = NOT_IMPLEMENTED`, экран подключения SHALL сообщать, что подключение репозиториев пока недоступно, а не показывать общую ошибку загрузки.

#### Scenario: Бэкенд отвечает 501

- **WHEN** `GET /api/v1/repositories/available` отвечает `501` с `code = NOT_IMPLEMENTED`
- **THEN** экран показывает, что подключение репозиториев пока недоступно
