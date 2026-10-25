# Tasks

## 1. SSH и туннель

- [x] 1.1 `.github/actions/stand-ssh` — копия из dmc-268-api-t1 с пометкой о синхронизации; `TF_VAR_docker_host: ssh://stand`
- [x] 1.2 `.github/actions/state-tunnel`: `-o ControlPath=none`, `ExitOnForwardFailure`, ожидание HTTP-ответа хранилища и ошибка про стек бэкенда; ручной SSH-шаг из `deploy.yml` убран

## 2. Проверки стенда

- [x] 2.1 `.github/scripts/deploy/check-{site,compression,protocols,api-proxy}.sh`, shellcheck без замечаний; в `deploy.yml` — по строке вызова, `HOST` в `env` job'а
- [x] 2.2 `debian:trixie-slim` по digest; адрес передаётся в контейнер переменной окружения
- [x] 2.3 Скрипты прогнаны против живого стенда (все проходят) и против локального образа в режиме HTTP: сжатие и проксирование API проходят, без HTTPS и без API — падают с понятной ошибкой

## 3. Образ

- [x] 3.1 Нижний регистр имени образа — один раз; один output `имя:тег@digest`, пустой digest роняет job `image`
- [x] 3.2 `local.ui_image_ref` в `infra/ui.tf` срезает тег; `tofu test` проверяет это и падает, если ресурс получает ссылку с тегом

## 4. Тесты

- [x] 4.1 `.github/tests/stand-ssh.test.mjs` в `pnpm run test`; проверено, что тест падает без ControlMaster и без `ControlPath=none` у туннеля
