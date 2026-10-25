# Proposal

## Why

Задача ui#74. SSH к стенду в `deploy.yml` собирался вручную шагом туннеля: `Host <адрес>` в `~/.ssh/config`, а docker-провайдер OpenTofu неявно зависел от конфига, оставленного предыдущим шагом (`TF_VAR_docker_host=ssh://<user>@<адрес>`). Проверки стенда — около 130 строк bash прямо в YAML, мимо shellcheck; `HOST` повторялся в шести шагах, нижний регистр имени образа считался дважды, у job'а `image` было два output'а (`image` и `image_ref`). Проверка HTTP/3 брала `debian:trixie-slim` плавающим тегом. Ожидание туннеля проверяло только то, что открыт локальный порт, а его слушает сам ssh: без хранилища состояния туннель «поднимался», и деплой падал позже, на `tofu init`.

## What Changes

- `.github/actions/stand-ssh` — копия action бэкенда (держать в синхроне): хост `stand` в `~/.ssh/config` с ключом, закреплённым `known_hosts` и ControlMaster. Docker-провайдер ходит на `ssh://stand`.
- `.github/actions/state-tunnel` — только туннель к хранилищу состояния бэкенда: своим соединением (`-o ControlPath=none`, мимо ControlMaster), с `ExitOnForwardFailure` и ожиданием HTTP-ответа хранилища; без ответа — ошибка «применён ли стек бэкенда?».
- Проверки стенда — `.github/scripts/deploy/check-{site,compression,protocols,api-proxy}.sh` под shellcheck; в YAML по строке вызова, `HOST` — в `env` job'а. Образ Debian для HTTP/3 — по digest, адрес уходит в контейнер переменной, а не подстановкой в текст команды.
- Один output образа — `имя:тег@digest`; непустой digest проверяется в job'е `image`. Ресурс образа в `infra/ui.tf` отбрасывает тег перед digest (`local.ui_image_ref`), как `local.api_image_ref` в бэкенде: новый тег при том же digest не заменяет образ и контейнер.
- Тест `.github/tests/stand-ssh.test.mjs` (vitest, как `tests/test_stand_ssh.py` бэкенда): скрипт `stand-ssh` пишет хост `stand` с ControlMaster и коротким ControlPath, каждый `ssh -L` в `.github/` и `scripts/` идёт с `-o ControlPath=none`, `state-tunnel` без `stand-ssh` падает с подсказкой.

## Capabilities

Поведение интерфейса и стенда не меняется, спеки не правятся (`skip_specs`): те же проверки после развёртывания, тот же образ по digest, тот же порядок стеков.

## Impact

- `.github/workflows/deploy.yml`, `.github/workflows/ci.yml` (комментарий shellcheck), новые `.github/actions/stand-ssh`, `.github/actions/state-tunnel`, `.github/scripts/deploy/*.sh`, `.github/tests/stand-ssh.test.mjs`.
- `vite.config.ts`: `include` тестов дополнен `.github/tests/**/*.test.mjs`.
- `infra/ui.tf`, `infra/tests/main.tftest.hcl`, `infra/README.md`.
