## 1. Тесты (красные до правки)

- [x] 1.1 `infra/tests/main.tftest.hcl`: образ контейнера — `<репозиторий>@sha256:<digest>` без тега, порт реестра не срезается, `stop_signal = "SIGQUIT"`, `destroy_grace_seconds = 10`. До правки падают три прогона
- [x] 1.2 `.github/tests/deploy-image.test.mjs`: вход в ghcr и `docker pull` по `DOCKER_HOST=ssh://stand` — шаги до apply; `worker_shutdown_timeout` задан и меньше `destroy_grace_seconds`. До правки падают четыре теста

## 2. Образ по digest

- [x] 2.1 Провайдер 4.6.0: `findImage` тянет образ, только если его нет локально; удаление без `destroy_grace_seconds` — `ContainerStop` с таймаутом 0
- [x] 2.2 `infra/ui.tf`: контейнер без `docker_image`, `removed` для `docker_image.ui`
- [x] 2.3 `deploy.yml`: `docker/login-action` и шаг «Скачать образ на сервер» до apply; `infra/README.md`

## 3. Остановка

- [x] 3.1 `infra/ui.tf`: `stop_signal`, `destroy_grace_seconds`; `Dockerfile`: `worker_shutdown_timeout 1s`
- [x] 3.2 Репетиция на `docker:29-dind`: переход со старого состояния, `No changes` на повторном plan и новом теге, остановка с SSE и без — без `kill sig=9` (design.md)
