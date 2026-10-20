## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Подключение, которое бэкенд ещё не реализовал

Если ручки подключения отвечают `501` с `code = NOT_IMPLEMENTED`, экран подключения SHALL сообщать, что подключение репозиториев пока недоступно, а не показывать общую ошибку загрузки.

#### Scenario: Бэкенд отвечает 501

- **WHEN** `GET /api/v1/repositories/available` отвечает `501` с `code = NOT_IMPLEMENTED`
- **THEN** экран показывает, что подключение репозиториев пока недоступно
