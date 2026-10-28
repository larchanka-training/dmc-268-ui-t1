# Tasks

## 1. Кнопка по can_connect

- [ ] 1.1 `pnpm api:sync` на коммит бэкенда с `can_connect`; поле в `AvailableRepositorySchema`; `covered_by_finding_id` в `ReviewFindingSchema`
- [ ] 1.2 Красные тесты страницы на фейке транспорта: при `can_connect = true` кнопка активна и подключает, при `false` — неактивна с подсказкой и без запроса
- [ ] 1.3 Кнопка в `ConnectRepositoryPage` по `can_connect`; мок `available` с `can_connect`

## 2. Приёмка

- [ ] 2.1 typecheck, lint, stylelint, format:check, test, build, openspec validate; перед мёржем — `pnpm api:sync` на develop бэкенда и `pnpm api:check`
