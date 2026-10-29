## ADDED Requirements

### Requirement: Помощь открыта гостю

Запрос `/app/help` или `/app/help/` без cookie сессии SHALL получать HTML приложения со
статусом `200`, а не редирект на `/login`: это исключение из требования «Гость не попадает
в приложение». Пути
глубже `/app/help/` и остальные пути под `/app/` SHALL оставаться закрытыми для гостя.

#### Scenario: Гость открывает помощь

- **WHEN** клиент без cookie сессии запрашивает `/app/help` или `/app/help/`
- **THEN** ответ — `200` с HTML приложения

#### Scenario: Гость открывает путь глубже помощи

- **WHEN** клиент без cookie сессии запрашивает `/app/help/x`
- **THEN** ответ — `302` на `/login?redirect=/app/help/x`

#### Scenario: Гость открывает другой путь приложения

- **WHEN** клиент без cookie сессии запрашивает `/app/reviews/42`
- **THEN** ответ — `302` на `/login?redirect=/app/reviews/42`
