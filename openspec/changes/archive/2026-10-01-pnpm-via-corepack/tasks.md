# Tasks

## 1. pnpm через Corepack

- [x] 1.1 Заменить `pnpm/action-setup` на `corepack enable` до `setup-node` во всех джобах `ci.yml`; проверить, что `git grep` не находит отдельной установки pnpm
- [x] 1.2 Оставить в README единственный способ — `corepack enable`

## 2. CI

- [x] 2.1 `concurrency` с отменой прогонов пул-реквеста, `permissions: contents: read`, `timeout-minutes` в `ci.yml`
- [x] 2.2 Actions на Node 24 в `ci.yml` и `deploy.yml`, таймауты у джоб деплоя

## 3. Приёмка

- [x] 3.1 Зелёный CI на новых actions и Corepack; кеш pnpm восстанавливается
- [ ] 3.2 Деплой на новых docker-action проходит (только после мёржа в `develop`)

## Примечания к выполнению

3.1: [CI 36787016217](https://github.com/larchanka-training/dmc-268-ui-t1/actions/runs/36787016217) — все четыре джобы зелёные, pnpm 12.3.4 скачан Corepack'ом. Первый прогон кеш не нашёл (другой путь хранилища), перезапуск джобы `lint` дал `Cache hit` на том же ключе. Change заархивирован до деплоя: 3.2 выполнима только после мёржа в `develop`.
