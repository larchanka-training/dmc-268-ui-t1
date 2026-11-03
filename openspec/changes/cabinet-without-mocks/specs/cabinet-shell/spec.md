## REMOVED Requirements

### Requirement: Источник данных кабинета

**Reason**: mock adapter и флаг `VITE_USE_MOCK_API` удаляются (ui#107): бэкенд реализует все ручки, которые вызывает кабинет.
**Migration**: требование «Данные кабинета с бэкенда»; тесты подменяют `ApiTransport` и `EventStream` фейком из `src/test`.

## ADDED Requirements

### Requirement: Данные кабинета с бэкенда

Экраны кабинета SHALL получать данные только через `ApiTransport` и `EventStream`. Приложение SHALL собирать HTTP-клиент к `/api/v1` и поток на `EventSource` и SHALL NOT содержать mock adapter, сценарный поток событий или флаг сборки, выбирающий источник данных. Тесты экранов SHALL подменять `ApiTransport` и `EventStream` фейком, а не собирать mock adapter приложения.

#### Scenario: Данные с бэкенда

- **WHEN** пользователь открывает `/repositories`
- **THEN** список запрашивается у бэкенда `GET /api/v1/repositories`

#### Scenario: Сборка без мока

- **WHEN** приложение собрано для стенда или локально
- **THEN** в бандле нет mock adapter, фикстур и мока входа, а источник данных не зависит от переменных сборки
