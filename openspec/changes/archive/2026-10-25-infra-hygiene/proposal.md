# Proposal

## Why

Ручной `tofu apply` из `infra/README.md` идёт мимо очереди `concurrency` в `deploy.yml`, а блокировки состояния у стека интерфейса нет — два запуска могут писать одно состояние. У стека бэкенда в том же хранилище она уже включена.

Спека требует образ по digest, но переменная `ui_image` принимает и тег: ошибка в деплое или ручной запуск по тегу дошли бы до сервера. Описание `service_host` запрещает `0.0.0.0`, а проверки нет — бесполезный `ui_url` всплыл бы только после применения. Логику конфигурации (порты при TLS, `PUBLIC_HOST`, сеть) ничто не проверяет, кроме самого деплоя.

## What Changes

- `backend.tf`: `use_lockfile = true` — lock-объект `ui/terraform.tfstate.tflock` рядом с состоянием; `skip_requesting_account_id = true`, как у бэкенда.
- Проверки переменных на этапе планирования: `ui_image` — только с digest `@sha256:<64 hex>`; `service_host` — не пустой и не адрес привязки ко всем интерфейсам. Проверка `ui_port = 80` при `public_tls` уже была. **BREAKING** для локального запуска: `apply` по тегу больше не проходит.
- Описания переменных по-русски.
- `main.tf` разложен на `network.tf` и `ui.tf`; два одинаковых блока порта 443 — один `dynamic "ports"` по `["tcp", "udp"]`. План не меняется.
- `infra/tests/main.tftest.hcl` на mock-провайдере; job CI `terraform` переименован в `opentofu` и запускает `tofu test`.
- OpenTofu 1.13.2 в CI и деплое (было 1.12.6), пол `required_version` — 1.13.0.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `frontend-delivery`: новое требование «Развёртывание отклоняет неверную конфигурацию до изменений на сервере».

## Impact

- `infra/backend.tf`, `infra/variables.tf`, `infra/versions.tf`, `infra/network.tf`, `infra/ui.tf` (вместо `infra/main.tf`), `infra/tests/main.tftest.hcl`, `infra/terraform.tfvars.example`, `infra/README.md`.
- `.github/workflows/ci.yml` (job `opentofu`), `.github/workflows/deploy.yml` (`tofu_version`).
- Закрывает [#76](https://github.com/larchanka-training/dmc-268-ui-t1/issues/76).
