# Proposal

## Why

У публичного входа, nginx интерфейса в контейнере `dmc268-ui`, нет метрик: RPS и число соединений видны только по логам, а в Prometheus есть только API за nginx. Задача ui#101, половина фронта — ui#133.

## What Changes

- Образ отдаёт `stub_status` nginx на внутреннем порту 8081, путь `/stub_status`, отдельным server в `conf.d/status.conf`. Так он один в режимах HTTP и HTTPS.
- Порт 8081 на хост не публикуется. До него дотягиваются только контейнеры в сетях стека, куда подключён и коллектор метрик бэкенда.
- CI проверяет ответ `stub_status` в шаге маршрутов.

Снимает метрики receiver `nginx` коллектора в dmc-268-api-t1 (#364).

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `frontend-delivery`: счётчики nginx для коллектора метрик.

## Impact

- `nginx/status.conf`, `Dockerfile`, `.github/workflows/ci.yml`.
