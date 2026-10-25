## 1. Деплой

- [x] 1.1 gate: ручной запуск только с `refs/heads/develop`, комментарий поправлен
- [x] 1.2 `environment: stand` у job'а `deploy`; секреты репозитория и организации job с environment видит

## 2. Гигиена workflow

- [x] 2.1 Все `uses` по SHA с комментарием версии, `persist-credentials: false` у всех checkout
- [x] 2.2 Выражения из `run` — в `env` шага
- [x] 2.3 Job `zizmor` и shellcheck в CI; zizmor без находок high
- [x] 2.4 Concurrency CI: `queue` от события, комментарий исправлен
