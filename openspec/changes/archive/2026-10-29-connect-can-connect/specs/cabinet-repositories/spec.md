## ADDED Requirements

### Requirement: Кнопка подключения по правам

На `/repositories/connect` кнопка «Подключить» у неподключённого репозитория SHALL быть активной, только если в строке `GET /api/v1/repositories/available` `can_connect = true`. При `can_connect = false` вместо кнопки SHALL показываться текст «Нужны права admin или maintain в репозитории на GitHub», и запрос подключения SHALL NOT отправляться. Если поля `can_connect` в ответе нет, кнопка SHALL быть активной: права проверяет бэкенд.

#### Scenario: Есть права на подключение

- **WHEN** у неподключённого репозитория в ответе `can_connect = true`
- **THEN** кнопка «Подключить» активна, нажатие вызывает `POST /api/v1/repositories`

#### Scenario: Прав на подключение нет

- **WHEN** у неподключённого репозитория в ответе `can_connect = false`
- **THEN** вместо кнопки «Подключить» — текст «Нужны права admin или maintain в репозитории на GitHub», `POST /api/v1/repositories` не вызывается

#### Scenario: Бэкенд без поля can_connect

- **WHEN** в строке ответа нет `can_connect` (бэкенд откатили до dmc-268-api-t1#233)
- **THEN** список разбирается, кнопка «Подключить» активна, на отказ бэкенда — прежнее сообщение об ошибке
