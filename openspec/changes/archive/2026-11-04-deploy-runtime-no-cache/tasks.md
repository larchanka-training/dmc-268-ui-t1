# Tasks

## 1. Образ и деплой

- [x] 1.1 Финальная стадия `Dockerfile` названа `runtime`
- [x] 1.2 `no-cache-filters: runtime` у build-push-action в `deploy.yml`, причина — в комментарии
- [x] 1.3 Комментарий у `provenance: false` без довода про одинаковый digest

## 2. Проверка

- [x] 2.1 Локально `docker buildx build --no-cache-filter runtime` с кешем: стадия `build` из кеша, `apk upgrade` выполняется заново, в образе libexpat 2.10.0-r0
- [x] 2.2 hadolint и zizmor без замечаний
