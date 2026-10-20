## ADDED Requirements

### Requirement: Источник данных кабинета

Экраны кабинета SHALL получать данные только через `ApiTransport` и `EventStream`. Приложение SHALL по умолчанию собирать mock adapter и сценарный поток событий, а с `VITE_USE_MOCK_API=false` — HTTP-клиент к `/api/v1` и поток на `EventSource`. Переход экрана с мока на бэкенд SHALL NOT требовать правки экрана.

#### Scenario: Данные с бэкенда

- **WHEN** приложение собрано с `VITE_USE_MOCK_API=false` и пользователь открывает `/repositories`
- **THEN** список запрашивается у бэкенда `GET /api/v1/repositories`

#### Scenario: Данные из мока

- **WHEN** `VITE_USE_MOCK_API` не задан
- **THEN** экраны получают данные из mock adapter по путям и формам контракта
