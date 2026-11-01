# Tasks

## 1. Проверка архива

- [x] 1.1 `scripts/check-openspec-archived.mjs` — порт `check_openspec_archived.py`: то же условие, текст ошибки и summary; вход с границы проверяется
- [x] 1.2 `.github/tests/check-openspec-archived.test.mjs`: завершённый change — код 1 и `::error::`, открытый — только в summary, change без задач не завершён, битый вход падает, summary — в `GITHUB_STEP_SUMMARY`
- [x] 1.3 `ci.yml`, job `openspec`: шаг `openspec list --json | node scripts/check-openspec-archived.mjs` с `shell: bash`; проверить локально, что на `develop` до архивации он падает на трёх change

## 2. Архив завершённых

- [x] 2.1 Заархивировать `repository-settings`, затем `repositories-one-page` (второй правит спеку первого)
- [x] 2.2 Закрыть приёмку 5.5 `review-run-live-status`, заархивировать его, затем `review-run-general-stream` (правит спеку первого)
- [x] 2.3 `openspec validate --all --strict` и проверка архива проходят; в `openspec list` нет завершённых change
