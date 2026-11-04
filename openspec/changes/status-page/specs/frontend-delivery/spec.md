## ADDED Requirements

### Requirement: Статус сервиса открыт гостю

Запрос `/app/status` или `/app/status/` без cookie сессии SHALL получать HTML приложения со
статусом `200`, а не редирект на `/login`: это исключение из требования «Гость не попадает
в приложение» (change `landing-page`), как у «Помощи». Пути глубже `/app/status/` SHALL
оставаться закрытыми для гостя. Запрос `GET /api/v1/status` без cookie сессии SHALL доходить
до API: перенаправление на API cookie не проверяет.

#### Scenario: Гость открывает статус

- **WHEN** клиент без cookie сессии запрашивает `/app/status` или `/app/status/`
- **THEN** ответ — `200` с HTML приложения

#### Scenario: Гость открывает путь глубже статуса

- **WHEN** клиент без cookie сессии запрашивает `/app/status/x`
- **THEN** ответ — `302` на `/login?redirect=/app/status/x`

#### Scenario: Гость запрашивает статус у API

- **WHEN** клиент без cookie сессии запрашивает `/api/v1/status`
- **THEN** запрос доходит до API без изменения пути, и клиент получает ответ API, а не
  редирект на вход
