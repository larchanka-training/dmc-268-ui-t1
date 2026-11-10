## 1. Тесты (красные до правки)

- [x] 1.1 `infra/tests/hardening.tftest.hcl`: `no-new-privileges`, сброс всех capabilities и возврат `CHOWN`, `NET_BIND_SERVICE`, `SETGID`, `SETUID`, healthcheck по `stub_status`. До правки `ui.tf` падают все три прогона

## 2. Ограничения контейнера

- [x] 2.1 Набор capabilities подобран прогоном образа: без `CHOWN` nginx не стартует (`chown /var/cache/nginx/client_temp`), без `SETUID` или `SETGID` воркеры умирают, без `NET_BIND_SERVICE` в podman нет порта 80 (Docker открывает его сам)
- [x] 2.2 `infra/ui.tf`: `security_opts`, `capabilities`, `healthcheck`; `infra/README.md`, комментарий в `nginx/status.conf`
- [x] 2.3 Прогон на `docker:29-dind`: режим HTTP; режим HTTPS с выпуском сертификата у pebble на свежем томе и на томе, заполненном контейнером без ограничений; перезапуск; healthcheck `healthy`. Продление проверено на ревью в rootless podman: pebble с `validityPeriod` 90 с, crt и key перезаписаны без ошибок доступа. `read_only` проверен и отклонён: tmpfs поверх `conf.d` прячет `status.conf`
