# Tasks

## 1. Контракт и генерация

- [x] 1.1 Добавить `openapi-typescript` в devDependencies с точной версией
- [x] 1.2 Написать `scripts/api-contract.sh` с режимами `sync [<sha>]` и `check`: sha валидируется как 40 hex, скачивание через `curl -f` падает на ответе не 200
- [x] 1.3 Завести скрипты `pnpm api:sync` и `pnpm api:check`
- [x] 1.4 Выполнить `pnpm api:sync efee055cc84e21ef2b6d169b83fff057b4f7dae6`: `VERSION`, `openapi.yaml`, `schema.d.ts` в `src/shared/api/contract/`
- [x] 1.5 Исключить сгенерированные файлы из Prettier и ESLint

## 2. CI и правила

- [x] 2.1 Добавить `pnpm api:check` в job `typecheck` в `ci.yml`
- [x] 2.2 Правило в `AGENTS.md` и раздел «Контракт API» в `.agents/rules/frontend.md`
- [x] 2.3 Раздел «Контракт API» в README и строки в таблице скриптов

## 3. Только develop бэкенда

- [x] 3.1 `pnpm api:sync` без аргумента берёт голову `develop` бэкенда (`git ls-remote`), с аргументом — указанный sha
- [x] 3.2 `pnpm api:check` падает, если зафиксированный sha не входит в `develop` бэкенда (GitHub API `compare/<sha>...develop`, статус не `ahead`/`identical` или 404); `GITHUB_TOKEN` передаётся в CI
- [x] 3.3 `pnpm api:check` предупреждает, но не падает, если контракт в голове `develop` отличается от зафиксированного (`::warning::` в GitHub Actions)
- [x] 3.4 README, `.agents/rules/frontend.md` и правило в `AGENTS.md` описывают фиксацию только из `develop`

## 4. Приёмка

- [x] 4.1 `pnpm api:check` проходит; правка одного символа в `openapi.yaml` или в `schema.d.ts` роняет его с подсказкой `pnpm api:sync`
- [x] 4.2 Проходят `typecheck`, `lint`, `stylelint`, `format:check`, `test`, `build`, `openspec validate --all --strict`
- [x] 4.3 Коммит из PR бэкенда роняет `pnpm api:check` с сообщением «контракт взят не из develop бэкенда»; после `pnpm api:sync` с головы `develop` проверка проходит
