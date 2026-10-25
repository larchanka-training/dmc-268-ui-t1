# Proposal

## Why

`dmc268-ui` — единственный публичный вход стенда: и интерфейс, и `/api/` идут через его nginx. Пока контейнер пересоздаётся, снаружи недоступно всё, но сколько длится этот простой и из чего он складывается, не видно: summary деплоя — только образ и адрес. Том ACME (`dmc268-ui-acme`) ничем не защищён: план, уничтожающий его, сотрёт ключ аккаунта и сертификаты, а перевыпуск упрётся в лимит Let's Encrypt — пять одинаковых сертификатов в неделю. Закрывает #84, по образцу larchanka-training/dmc-268-api-t1#205.

## What Changes

- Выкат — планом в файл: `plan.sh` (`tofu init`, `tofu plan -lock-timeout=2m -out=tfplan`, `tofu show -json` трубой в `scripts/deploy-report.mjs plan`) и `apply.sh` (`tofu apply -lock-timeout=2m tfplan`). Сторож: `delete` у тома ACME — по адресу `docker_volume.acme` или по имени тома `dmc268-ui-acme` — роняет шаг до apply. Файл плана удаляется во всех ветках.
- `lifecycle { prevent_destroy = true }` у `docker_volume.acme`: держит и ручные `tofu apply`/`tofu destroy` мимо деплоя. Сторож закрывает то, что `prevent_destroy` пропускает: блок тома удалён из конфигурации.
- `apply.sh` собирает сырьё для разбивки простоя: часы сервера относительно раннера, id старого контейнера, поток `docker events` (`kill`, `die`, `create`, `start`, `pull`) всё время apply, `docker inspect` нового (только `Id`, `Created`, `State`).
- Проверки здоровья у контейнера нет, поэтому готовность — первый успешный ответ HTTPS снаружи: `check-site.sh` и `check-api-proxy.sh` записывают время первой попытки, последней неуспешной и ответа.
- `summary.sh` (`if: always()`, `timeout-minutes: 3`): диск сервера `df -Pk`, затем `deploy-report.mjs render` — исход и шаг падения, простой публичного входа по этапам, ответ `/api/v1/` через прокси, план по типам ресурсов, диск, длительность шагов. Ключи — OpenTelemetry (`cicd.pipeline.*`), свои — `dmc268.deploy.*`, как у бэкенда.
- Засечки шагов — `mark.sh` (копия из бэкенда) первой строкой каждого шага с `run`; исходы — `STEP_RESULTS` в env шага summary; у каждого шага job'а `deploy` — id.
- `stand-ssh`: `ServerAliveInterval 10`, `ServerAliveCountMax 3` — синхронно с бэкендом.
- `setup-opentofu` без обёртки (`tofu_wrapper: false`): она копирует stdout tofu в выходы шага, а в JSON плана — токен реестра.

## Capabilities

### Modified Capabilities

- `frontend-delivery`: развёртывание не уничтожает том ACME; развёртывание интерфейса отчитывается о выкате.

## Impact

- `.github/workflows/deploy.yml`, `.github/actions/stand-ssh`, `.github/scripts/deploy/` (`plan.sh`, `apply.sh`, `summary.sh`, `mark.sh` — новые; `check-site.sh`, `check-api-proxy.sh`), `scripts/deploy-report.mjs`, `infra/ui.tf`, `infra/README.md`.
- Тесты: `.github/tests/deploy-report.test.mjs`, фикстуры `.github/tests/fixtures/deploy-report/`, `.github/tests/stand-ssh.test.mjs`.
- `tofu destroy` теперь падает на томе ACME — снести стенд можно, только сняв `prevent_destroy`.
- Права токена не меняются. Главная проверка — первый деплой после мёржа: поток событий через ControlMaster и `df` на сервере в CI фронта ещё не шли.
