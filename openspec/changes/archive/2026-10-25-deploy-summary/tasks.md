# Tasks

## 1. Сторож и план в файл

- [x] 1.1 `scripts/deploy-report.mjs`: `planChanges` и `protectedDeletes` (адрес или имя тома); команда `plan` пишет `plan.json` и падает на `delete` тома ACME
- [x] 1.2 `.github/scripts/deploy/plan.sh`: `tofu init`, `tofu plan -lock-timeout=2m -out=tfplan`, `tofu show -json` трубой в `deploy-report.mjs plan`, отклонённый план удаляется
- [x] 1.3 `.github/scripts/deploy/apply.sh`: `tofu apply -lock-timeout=2m tfplan`, файл плана удаляется на выходе
- [x] 1.4 `infra/ui.tf`: `lifecycle { prevent_destroy = true }` у `docker_volume.acme`; `infra/README.md` — сторож, `tofu destroy` и смена тома

## 2. Сырьё для отчёта

- [x] 2.1 `apply.sh`: часы сервера, id старого `dmc268-ui`, поток `docker events`, `docker inspect` нового (`Id`, `Created`, `State`); сбой ssh — `<файл>.error`
- [x] 2.2 `check-site.sh`, `check-api-proxy.sh`: первая попытка, последняя неуспешная и ответ — в `probes`
- [x] 2.3 `mark.sh` — копия из бэкенда; `summary.sh`: `df -Pk` корня и каталога Docker, `deploy-report.mjs render`

## 3. Summary и workflow

- [x] 3.1 `deploy-report.mjs`: `downtime`, `clockOffset`, `disk`, `durations`, `stepRows`, `failedStep`; `render` — markdown с ключами OpenTelemetry и `dmc268.deploy.*`
- [x] 3.2 `deploy.yml`: id у всех шагов job'а `deploy`, засечка первой строкой шагов с `run`, план и apply через скрипты, `STEP_RESULTS`, `tofu_wrapper: false`, шаг summary с `timeout-minutes: 3`
- [x] 3.3 `stand-ssh`: `ServerAliveInterval 10`, `ServerAliveCountMax 3` — сверка `diff` с бэкендом пустая

## 4. Ревью #90

- [x] 4.1 `apply.sh`: пробник `https://$HOST/` раз в 0,25 с до `tofu apply`, остановка в `finish`; `deploy-report.mjs`: простой — от первого отказа до первого 2xx после `StartedAt`, граница по `check-site.sh` — запасной вариант
- [x] 4.2 `plan.sh`: код и stderr `tofu plan`; отказ `prevent_destroy` у тома — в `plan.json` и в summary
- [x] 4.3 `apply.sh`: `--since` потока событий по часам сервера

## 5. Проверки

- [x] 5.1 `.github/tests/deploy-report.test.mjs`: сторож на фикстурах `tofu show -json` 1.13.2, скрипты bash'ем с подложными `tofu`, `ssh`, `curl`, разбивка простоя на событиях из репетиции, раскладка job'а против `STEPS`
- [x] 5.2 Репетиция на `docker:29-dind`: первый выкат, замена образа, повтор без изменений; блок тома удалён — `plan.sh` exit 1; смена имени тома и `tofu destroy` — отказ `prevent_destroy`; смена тома через `removed` проходит
- [x] 5.3 shellcheck, zizmor, actionlint, `tofu fmt`/`validate`/`test`, typecheck, lint, stylelint, format:check, test, build, `openspec validate`
