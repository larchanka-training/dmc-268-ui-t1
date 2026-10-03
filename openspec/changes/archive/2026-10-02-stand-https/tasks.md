# Tasks

## 1. nginx

- [x] 1.1 Вынести общие location в `nginx/site.conf`; `nginx/http.conf` — HTTP на 80 для локального режима
- [x] 1.2 `nginx/https.conf.template`: `acme_issuer` с `profile shortlived require` и `state_path` на томе, сервер 443 с `acme_certificate` на `PUBLIC_HOST`, 80 перенаправляет на HTTPS
- [x] 1.3 Скрипт в `/docker-entrypoint.d/` выбирает режим по `PUBLIC_HOST`; `Dockerfile` подключает модуль `ngx_http_acme_module`

## 2. Инфраструктура

- [x] 2.1 Том `dmc268-ui-acme`, порт 443 и `PUBLIC_HOST` при `public_tls`; `ui_url` с `https://`
- [x] 2.2 В деплое включить `public_tls`; smoke-проверки по `https://` с проверкой сертификата и ожиданием первого выпуска

## 3. Проверка

- [x] 3.1 Локальный режим: образ без `PUBLIC_HOST` отдаёт интерфейс и проксирует `/api/v1/...` как раньше
- [x] 3.2 Режим TLS против Pebble (тестовый ACME-сервер): сертификат на IP с профилем `shortlived` выпускается, 80 перенаправляет на 443, после перезапуска контейнера сертификат берётся с тома, а не выпускается заново
- [x] 3.3 `tofu fmt -check` и `tofu validate` для `infra/`, `actionlint` для workflow

## 4. Документация

- [x] 4.1 `infra/README.md` и `README.md`: адрес стенда по HTTPS, устройство TLS, что делать, если сертификат не продлился
