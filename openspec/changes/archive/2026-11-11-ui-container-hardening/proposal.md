# Proposal

## Why

У контейнера интерфейса нет ограничений, которые есть у контейнеров бэкенда (#79): процессы в нём могут получить новые привилегии, у мастера nginx полный набор capabilities root, а проверки здоровья нет — Docker считает контейнер живым, даже если воркеры nginx умерли и запросы не обслуживаются.

## What Changes

- `infra/ui.tf`: `security_opts = ["no-new-privileges:true"]`; `capabilities` — сброс всех и возврат `CHOWN`, `SETUID`, `SETGID`, `NET_BIND_SERVICE`; `healthcheck` по `stub_status` на 8081.
- `read_only` не включаем: tmpfs поверх `conf.d` прячет `status.conf` образа, а тела вебхуков до 25 МБ nginx буферизует в `/var/cache/nginx`, и в tmpfs они легли бы в потолок памяти 128 МБ.
- Тесты: `infra/tests/hardening.tftest.hcl`.

## Capabilities

### Modified Capabilities

- `frontend-delivery`: контейнер интерфейса работает с минимальными привилегиями и сообщает о своём здоровье.

## Impact

- `infra/ui.tf`, `infra/tests/hardening.tftest.hcl`, `infra/README.md`, `nginx/status.conf` (комментарий).
- Опции безопасности и healthcheck пересоздают `dmc268-ui`; он и так пересоздаётся на каждом деплое.
- Набор capabilities проверен прогоном образа на Docker 29.9 в обоих режимах, с выпуском сертификата у pebble и стартом на томе ACME, заполненном без ограничений. На стенде после деплоя проверить HTTPS, HTTP/3 и продление сертификата.
