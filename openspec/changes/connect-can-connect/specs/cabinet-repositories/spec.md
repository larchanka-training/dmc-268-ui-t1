## ADDED Requirements

### Requirement: Кнопка подключения по правам

На `/repositories/connect` кнопка «Подключить» у неподключённого репозитория SHALL быть активной, только если в строке `GET /api/v1/repositories/available` `can_connect = true`. При `can_connect = false` кнопка SHALL быть неактивной, с подсказкой «Нужны права admin или maintain в репозитории на GitHub», и запрос подключения SHALL NOT отправляться.

#### Scenario: Есть права на подключение

- **WHEN** у неподключённого репозитория в ответе `can_connect = true`
- **THEN** кнопка «Подключить» активна, нажатие вызывает `POST /api/v1/repositories`

#### Scenario: Прав на подключение нет

- **WHEN** у неподключённого репозитория в ответе `can_connect = false`
- **THEN** кнопка «Подключить» неактивна, при наведении — подсказка «Нужны права admin или maintain в репозитории на GitHub», `POST /api/v1/repositories` не вызывается
