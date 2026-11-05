# Proposal

## Why

У `.github/actions/state-tunnel` один вызывающий, job деплоя в `deploy.yml`. При этом action принимает input `port`, который всегда получает `'9000'`, и первым делом проверяет `~/.ssh/config` на хост `stand`, хотя порядок шагов задан тем же единственным `deploy.yml`. В бэкенде то же самое убрано из `s3-backend` (api#353). Задача #128.

## What Changes

- Порт 9000 становится константой в action, как в `infra/backend.tf`; input `port` удаляется.
- Проверка `~/.ssh/config` удаляется вместе с её тестом в `stand-ssh.test.mjs`. Если шаги переставить, `ssh` упадёт на `Could not resolve hostname stand`.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет.

`skip_specs: true`: меняется обвязка деплоя, а не поведение интерфейса.

## Impact

- `.github/actions/state-tunnel/action.yml`, `.github/workflows/deploy.yml`, `.github/tests/stand-ssh.test.mjs`.
