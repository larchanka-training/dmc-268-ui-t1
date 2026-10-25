## Why

Задача ui#73. Ручной запуск деплоя не проверял ветку: `workflow_dispatch` с любой ветки собирал образ, публиковал его и катил на стенд мимо CI. Environment у job'а деплоя не было. Все `uses` в `.github/` стояли по подвижным тегам, checkout оставлял токен в `.git/config`, выходы шагов подставлялись прямо в `run`, а zizmor и shellcheck в CI не запускались. Комментарий concurrency в CI обещал результат по каждому коммиту `develop`, но без `queue: max` следующий пуш отменял ожидающий прогон.

## What Changes

- Ручной запуск деплоя — только с `refs/heads/develop`: с другой ветки gate не проходит, и образ не собирается. Job `deploy` получает `environment: stand` с политикой «только `develop`»; секреты остаются на уровне репозитория и организации.
- Все `uses` закреплены по SHA с комментарием версии (те же SHA, что в бэкенде), у каждого checkout — `persist-credentials: false`, выражения из `run` перенесены в `env` шага.
- Новый job `zizmor` в CI (`--offline --persona pedantic --min-severity high`) и shellcheck по shell-скриптам репозитория. `workflow_run` помечен `zizmor: ignore[dangerous-triggers]`: gate катит только прогон CI по push и проверенный `head_sha`.
- Concurrency CI: у push — `queue: max` без отмены, у pull_request — отмена и `single`.

## Capabilities

### Modified Capabilities

- `frontend-delivery`: ручной запуск развёртывания — только с `develop`.

## Impact

- `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`, `.github/actions/setup/action.yml`.
- Environment `stand` в настройках репозитория (уже создан, политика веток — `develop`).
