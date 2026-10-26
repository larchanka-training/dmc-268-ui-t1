# Proposal

## Why

Репетиция summary деплоя (#84) на `docker:29-dind` показала два изъяна выката интерфейса (#89):

1. `docker_image.ui` заменяется на каждом коммите: в ссылке на образ тег — commit sha. Замена идёт между удалением старого `dmc268-ui` и созданием нового, и pull из ghcr попадает в простой публичного входа — а через него идёт и API (у бэкенда то же исправлено в api#204).
2. У `dmc268-ui` не задан `destroy_grace_seconds`: провайдер останавливает контейнер с таймаутом 0, и SIGKILL приходит через 7 мс после SIGQUIT. Рвутся запросы и SSE, а продление сертификата в этот момент может оборвать запись файлов ACME на томе.

## What Changes

- `infra/ui.tf`: ресурса `docker_image.ui` больше нет. Контейнер ссылается на образ строкой `<репозиторий>@sha256:<digest>` (`local.ui_image_ref`, тег срезан); ресурс образа уходит из состояния блоком `removed` без уничтожения.
- `.github/workflows/deploy.yml`: вход в ghcr на раннере и шаг `docker pull` образа на сервер (`DOCKER_HOST=ssh://stand`) до apply.
- `infra/ui.tf`: `stop_signal = "SIGQUIT"`, `destroy_grace_seconds = 10`. `Dockerfile`: `worker_shutdown_timeout 1s` в главном конфиге nginx — потоки SSE nginx обрывает сам, не дожидаясь SIGKILL.
- Тесты: `infra/tests/main.tftest.hcl` (ссылка без тега, порт реестра, сигнал и grace), `.github/tests/deploy-image.test.mjs` (pull до apply, `worker_shutdown_timeout` меньше grace).

## Capabilities

### Modified Capabilities

- `frontend-delivery`: смена контейнера интерфейса не включает скачивание образа; контейнер останавливается штатно, без принудительного завершения.

## Impact

- `infra/ui.tf`, `infra/README.md`, `infra/tests/main.tftest.hcl`, `Dockerfile`, `.github/workflows/deploy.yml`, `.github/tests/deploy-image.test.mjs`.
- Первый деплой после мёржа пересоздаёт `dmc268-ui` один раз (в состоянии `image` — ID образа, в конфигурации — ссылка) и ещё с SIGKILL: провайдер удаляет контейнер по прежнему состоянию, где `destroy_grace_seconds` нет. Штатная остановка — со второго деплоя.
- Простой публичного входа при открытых потоках SSE — до 1 с дренажа плюс запуск нового контейнера; без них — доли секунды.
- `registry_auth` у провайдера остаётся: он нужен, только если образа на сервере нет (локальный `apply` без `docker pull`).
