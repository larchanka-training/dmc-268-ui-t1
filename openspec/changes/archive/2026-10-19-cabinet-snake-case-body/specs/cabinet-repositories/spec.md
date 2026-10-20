## MODIFIED Requirements

### Requirement: Server state via TanStack Query

Списки репозиториев и подключение SHALL использовать TanStack Query (запросы и мутации) поверх `ApiTransport`, а не прямую загрузку данных в компонентах страниц. Пути и формы ответов SHALL соответствовать контракту бэкенда: подключённые — `GET /api/v1/repositories`, доступные — `GET /api/v1/repositories/available`, подключение — `POST /api/v1/repositories` с телом `{provider, provider_id}`.

#### Scenario: Connected repositories list

- **WHEN** вошедший пользователь открывает `/repositories`
- **THEN** приложение SHALL показать состояние загрузки
- **AND** SHALL показать подключённые репозитории из `GET /api/v1/repositories`: имя, ветку по умолчанию, провайдера, включено ли автоматическое ревью, дату подключения

#### Scenario: Connect repository

- **WHEN** пользователь подключает доступный репозиторий на `/repositories/connect`
- **THEN** приложение SHALL вызвать мутацию `POST /api/v1/repositories`
- **AND** SHALL обновить список подключённых после успеха
