## 1. Потолок памяти

- [x] 1.1 `memory` и `memory_swap` 128 МБ у `docker_container.ui`
- [x] 1.2 Тест `ui_memory_is_capped_without_swap` (без правки падает)
- [x] 1.3 Строка в `infra/README.md`

## 2. Проверка на стенде (после мёржа)

- [ ] 2.1 После деплоя `docker inspect dmc268-ui` показывает `Memory=134217728`, следующий деплой меняет только образ

## Примечания к выполнению

Change заархивирован до деплоя, как `node-24-and-provider-4`: 2.1 проверяется после мёржа.

Ротация логов из задачи уже есть с #106: драйвер `fluentd`, в `docker inspect` — `cache-max-size: 10m` и `cache-max-file: 3`, а не `max-size`/`max-file`.
