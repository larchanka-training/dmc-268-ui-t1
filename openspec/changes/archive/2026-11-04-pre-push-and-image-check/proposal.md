## Why

Аудит 2026-11-04 нашёл во фронте две проверки, которые повторяют соседние:

- pre-push запускал `pnpm check-types`, а следом `pnpm build`, в котором тоже стоит `tsc`: типы проверялись дважды на каждом push.
- Шаг деплоя «Убедиться, что образ забирается обратно» делал `docker manifest inspect` по `image@digest`, а следующий шаг trivy и `docker pull` при выкате берут тот же манифест из реестра. Если push не прошёл, падает сам `build-push-action`.

## What Changes

- `.githooks/pre-push`: `pnpm test && pnpm build`. Скрипты `check-types` и `typecheck` остаются: на них ссылаются CI, AGENTS.md и спека `build-tooling`.
- Шаг «Убедиться, что образ забирается обратно» удалён из `deploy.yml`.
- README: строка про pre-push.

## Capabilities

### New Capabilities

### Modified Capabilities

- `git-hooks`: pre-push запускает `pnpm test && pnpm build` без отдельного `check-types`.

## Impact

- Push быстрее на один прогон `tsc`; что проверяется, не меняется.
- Пустой digest ловит короткий шаг перед trivy с понятной ошибкой: проверка на пустоту из удалённого шага осталась, ушёл только повторный `manifest inspect`.
