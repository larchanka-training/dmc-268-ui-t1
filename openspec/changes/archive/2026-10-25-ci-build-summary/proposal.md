# Proposal

## Why

Размер JS-бандла — то, что качает каждый пользователь, — нигде не отслеживается: рост на сотни килобайт после новой зависимости заметили бы только по медленной загрузке. Размер образа и находки сканеров (hadolint и trivy в job `image`) тоже не видны: CI показывает только красное или зелёное, а что trivy пропускает через `ignore-unfixed`, не видно вовсе.

## What Changes

- Job `image` пишет в `$GITHUB_STEP_SUMMARY`: размер бандла по `dist/assets` (js, css) — исходный и gzip, итого по типам, топ-5 файлов; размер образа и сжатый размер; находки trivy по severity с разбивкой на «с исправлением» и `unfixed`; замечания hadolint по уровням, включая ниже порога job'а.
- Разница с develop — к метрикам последнего успешного прогона develop, которые лежат в кэше Actions.
- Логика — `scripts/build-summary.mjs` (разбор и markdown) и `scripts/build-summary.sh` (вынуть `dist/assets` и размеры из образа); тест на фикстурах — `.github/tests/build-summary.test.mjs`.
- Имена значений — по семантическим соглашениям OpenTelemetry (`cicd.pipeline.*`, `container.image.*`, `vcs.ref.*`), своё — `dmc268.build.*`, как в summary деплоя бэкенда.
- Шаги summary ничего не роняют: падает только gate (hadolint, trivy с `ignore-unfixed`), как раньше.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет: поведение интерфейса и стенда не меняется, спеки не правятся (`skip_specs: true`).

## Impact

- `.github/workflows/ci.yml` (job `image`), `scripts/build-summary.{mjs,sh}`, `.github/tests/build-summary.test.mjs` и фикстуры.
- Новый action — `actions/cache` v6.1.0 (restore, save), закреплён по SHA.
- Закрывает [#85](https://github.com/larchanka-training/dmc-268-ui-t1/issues/85).
