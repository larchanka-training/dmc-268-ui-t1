# Tasks

## 1. Состояние

- [x] 1.1 `backend.tf`: `use_lockfile = true`, `skip_requesting_account_id = true`

## 2. Переменные

- [x] 2.1 Тест на отказ `ui_image` без digest — красный до проверки
- [x] 2.2 Проверки `ui_image` и `service_host`, описания переменных по-русски, пример — ссылка с digest

## 3. Конфигурация

- [x] 3.1 `network.tf` и `ui.tf` вместо `main.tf`, один `dynamic "ports"` по `["tcp", "udp"]`
- [x] 3.2 Планы до и после совпадают (`tofu show -json`, с TLS и без)
- [x] 3.3 `infra/tests/main.tftest.hcl`: порты и `PUBLIC_HOST` с TLS и без, сеть `dmc268`, `ui_url`, отказы переменных

## 4. CI и документация

- [x] 4.1 Job `opentofu` с `tofu test`, OpenTofu 1.13.2 в `ci.yml` и `deploy.yml`, `required_version >= 1.13.0`
- [x] 4.2 `infra/README.md`: digest, блокировка, раскладка файлов, `tofu test`
