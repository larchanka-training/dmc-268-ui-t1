## ADDED Requirements

### Requirement: Помощь открыта гостю

Запрос `/app/help` без cookie сессии SHALL получать HTML приложения со статусом `200`, а не
редирект на `/login`. Остальные пути под `/app/` SHALL оставаться закрытыми для гостя.

#### Scenario: Гость открывает помощь

- **WHEN** клиент без cookie сессии запрашивает `/app/help`
- **THEN** ответ — `200` с HTML приложения

#### Scenario: Гость открывает другой путь приложения

- **WHEN** клиент без cookie сессии запрашивает `/app/reviews/42`
- **THEN** ответ — `302` на `/login?redirect=/app/reviews/42`
