# Tasks

## 1. Прокси трейсов браузера

- [x] 1.1 Зона `otlp` в `nginx/http.conf` и `nginx/https.conf.template`
- [x] 1.2 `location = /otlp/v1/traces` в `nginx/site.conf`
- [x] 1.3 Сеть `dmc268-otlp`: data source и подключение контейнера, тест в `infra/tests/main.tftest.hcl`
- [x] 1.4 `scripts/check-routes.sh`: `GET /otlp/v1/traces` — 403

## 2. Документы и приёмка

- [x] 2.1 `infra/README.md`
- [x] 2.2 `nginx -t` в обоих режимах, маршруты, прогон с поддельным коллектором: путь `/v1/traces`, без cookie, 413 на 600 КБ, 429 после очереди, 502 без коллектора
