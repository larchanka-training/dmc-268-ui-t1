# Design

## База для сравнения с develop

Нужны метрики последнего успешного прогона develop. Варианты:

1. **Артефакт `build-metrics.json` + `actions/download-artifact` с `run-id`.** Скачивание артефакта другого прогона требует `github-token` и права `actions: read` (документация `actions/download-artifact`, «Download Artifacts from other Workflow Runs or Repositories»), а номер прогона придётся искать через API (`gh run list`). Права токена растут, добавляется сетевой запрос к API и логика «последний успешный».
2. **Пересборка develop в том же job'е.** Удваивает время job'а (`docker build` на холодном кэше слоёв — минуты) ради одного числа.
3. **Только абсолют.** Не закрывает DoD: рост виден лишь тому, кто помнит прошлое значение.
4. **Кэш Actions (выбрано).** Прогон develop после успеха сохраняет `build-base/metrics.json` с ключом `build-metrics-<sha>`; любой прогон восстанавливает самый свежий по `restore-keys: build-metrics-`. Пул-реквест видит кэш своей базовой ветки (develop) — это правило области видимости кэша. Токену ничего не нужно: кэш ходит по `ACTIONS_RUNTIME_TOKEN`, `permissions` остаётся `contents: read`. Секретов стенда в job'е нет и не появляется. Ключ по sha, потому что запись кэша неизменяема, а «последняя» выбирается по времени создания. Сохраняется только после успеха всего job'а (шаг без `always()`), то есть база — действительно последний успешный develop.

Ограничения выбранного варианта: кэш вытесняется через 7 дней без обращений и при превышении лимита репозитория. Тогда базы нет, и summary честно пишет «Базы для сравнения нет» и показывает абсолют — это не ошибка. Метрики лежат в кэше, а не в долговечном хранилище: это подсказка в summary, а не источник правды (бюджетов и красного CI за рост пока нет).

## Размер образа

Несжатый — `docker image inspect --format '{{.Size}}'`. Сжатый — `docker save | gzip -c | wc -c`: на образе с nginx около двух секунд, поэтому берём; это порядок размера слоёв при отдаче в реестр, но не точное значение (реестр жмёт каждый слой отдельно).

## Сканеры

Gate остаётся прежним (hadolint c порогом `info`, trivy HIGH и CRITICAL с `ignore-unfixed`). Второй запуск каждого — с `format: json` в файл и без падения (`no-fail: true`, `exit-code: '0'`): так видно то, что gate пропускает — `unfixed` у trivy и уровень `style` у hadolint. Шаги summary идут с `!cancelled()`, чтобы summary был и после красного gate.

## Скрипт

Node (`.mjs`, стандартная библиотека), потому что тесты проекта — vitest, а разбор JSON и таблицы проще проверять на фикстурах, чем в bash. Доступ к docker — в `build-summary.sh`, чтобы его проверял `shellcheck` из job'а `zizmor`. `render` не падает на отсутствующих файлах: нет сканера или базы — нет раздела.

## Имена

Ключи по соглашениям OpenTelemetry, как в `scripts/deploy_report.py` бэкенда: `cicd.pipeline.name`, `cicd.pipeline.run.id`, `cicd.pipeline.task.name`, `cicd.pipeline.task.type`, `container.image.name`, `container.image.id`, `vcs.ref.head.revision`. Своё — `dmc268.build.bundle.{files,size,size.gzip}`, `dmc268.build.image.{size,size.compressed}`, `dmc268.build.scan.{severity,vulnerabilities}`, `dmc268.build.lint.{level,findings}`.
