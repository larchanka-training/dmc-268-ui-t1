# Proposal

## Why

Кабинет умеет отправлять трейсы браузера (#49) на свой же адрес, `/otlp/v1/traces`, но nginx
интерфейса этот путь не знает: запрос получает 404, и экспорт выключен. Коллектор поднят на стенде
стеком наблюдаемости бэкенда (larchanka-training/dmc-268-api-t1#108) и стоит в сети `dmc268-otlp`.

## What Changes

- `location = /otlp/v1/traces` в `nginx/site.conf`: только `POST`, прокси на `dmc268-otelcol:4318`,
  cookie срезаются, тело до 512 КБ, частота — зона `otlp` (5 запросов в секунду с адреса, очередь 20) в `nginx/http.conf` и `nginx/https.conf.template`.
- Контейнер интерфейса подключается к сети `dmc268-otlp` (`infra/network.tf`, `infra/ui.tf`).
- `scripts/check-routes.sh`: `GET /otlp/v1/traces` — 403. Тест сетей в `infra/tests/main.tftest.hcl`.
- `infra/README.md`: как устроен приём трейсов.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `frontend-delivery`: новое требование «Трейсы браузера уходят на тот же адрес».
