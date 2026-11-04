## Why

#63. У контейнера `dmc268-ui` нет потолка памяти: на стенде лимит равен памяти хоста (7,8 ГБ). У
контейнеров бэкенда потолок есть. Ротация логов, о которой тоже говорит задача, уже есть: драйвер
`fluentd` с кэшем `docker logs` 3 файла по 10 МБ (`cache-max-size`, `cache-max-file`).

## What Changes

- `memory = 128`, `memory_swap = 128` у `docker_container.ui`: nginx на стенде занимает около
  10 МБ, пик — 17 МБ.
- Тест `ui_memory_is_capped_without_swap` в `infra/tests/main.tftest.hcl`, строка в `infra/README.md`.

## Impact

- `infra/ui.tf`, `infra/tests/main.tftest.hcl`, `infra/README.md`. Контейнер интерфейса и так
  пересоздаётся на каждом деплое, отдельного выката не нужно.
