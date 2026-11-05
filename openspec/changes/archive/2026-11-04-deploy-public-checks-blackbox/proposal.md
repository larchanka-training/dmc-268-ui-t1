# Proposal

## Why

Задача ui#126. После выката деплой проверял публичный вход четырьмя bash-скриптами (`check-site.sh`, `check-protocols.sh`, `check-compression.sh`, `check-api-proxy.sh`), которые разбирали вывод curl, а для HTTP/3 ставили curl в отдельный контейнер Debian. Всё это штатно умеет HTTP-проба blackbox_exporter: сертификат, тело, редирект, заголовки, версия HTTP, QUIC, gzip, JSON.

## What Changes

- `nginx/blackbox.yml` — модули проверок рядом с конфигом nginx, который они проверяют: `site` (HTTPS с действительным сертификатом, 200, «DMC-268» в теле), `http_redirect` (HTTP → 301/308 на `https://…/`), `https_headers` (HTTP/2, `Strict-Transport-Security` с `max-age=`, `Alt-Svc` с `h3=":443"`), `http3` (HTTP/3 по QUIC), `gzip` (`/app/` с cookie сессии приходит сжатым), `api` (`/api/v1/` — 404 с JSON-полем `detail`).
- `.github/scripts/deploy/check-public.sh` — один шаг `check_public` вместо четырёх: разовый `quay.io/prometheus/blackbox-exporter` (версия и digest закреплены, без анонимного лимита Docker Hub) на петле раннера, ожидание сайта (до 2 мин) и API (до 1 мин) с засечками в `probes` в прежнем формате, остальные модули — по одному вызову `/probe`. Не прошёл модуль — лог этой пробы (`/probe?debug=true`, от уровня логов exporter'а не зависит) с причиной и ошибка; контейнер убирается в любом случае.
- `deploy.yml`, `STEPS` в `scripts/deploy-report.mjs`, тесты отчёта деплоя — под новый шаг.

## Capabilities

Поведение интерфейса и стенда не меняется, спеки не правятся (`skip_specs`): требования `frontend-delivery` (HTTP/2 и HTTP/3, HSTS, сжатие, API через адрес интерфейса) проверяются после деплоя так же, меняется только инструмент.

## Impact

- `nginx/blackbox.yml`, `.github/scripts/deploy/check-public.sh` (новые); четыре прежних скрипта удалены; `.github/workflows/deploy.yml`, `scripts/deploy-report.mjs`, `.github/scripts/deploy/apply.sh` (комментарии), `.github/tests/deploy-report.test.mjs`.
- Отличия от прежних проверок: хост в `Location` редиректа не сверяется с адресом стенда (модуль статичен) — проверяется схема https и корень; сжатие проверяется на HTML `/app/` (тот же `gzip_static` и готовые `.gz`), а не на JS-бандле, имя которого бралось из HTML; на «отвечает, но не наш сайт» и «API ответил не тем» шаг ждёт весь срок ожидания, а не падает с первой попытки.
- Summary: вместо пяти строк проверок — «Проверить публичный вход» и «Проверить маршруты»; время ответа HTTPS и API — как раньше.
