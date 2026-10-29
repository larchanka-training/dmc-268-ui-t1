# Tasks

## 1. Кнопка по can_connect

- [x] 1.1 `pnpm api:sync` на коммит бэкенда с `can_connect`; поле в `AvailableRepositorySchema`; `covered_by_finding_id` в `ReviewFindingSchema`
- [x] 1.2 Красные тесты страницы на фейке транспорта: при `can_connect = true` кнопка активна и подключает, при `false` — вместо кнопки причина текстом и без запроса, без поля — кнопка активна
- [x] 1.3 Кнопка в `ConnectRepositoryPage` по `can_connect`; мок `available` с `can_connect`

## 2. Приёмка

- [x] 2.1 typecheck, lint, stylelint, format:check, test, build, openspec validate; перед мёржем — `pnpm api:sync` на develop бэкенда и `pnpm api:check`
