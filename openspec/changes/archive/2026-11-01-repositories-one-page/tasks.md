# Tasks

## 1. Контракт и данные

- [x] 1.1 `pnpm api:sync` с головы `develop` бэкенда после мёржа #247, #248, #252 (`dfbc720`)
- [x] 1.2 `entities/repository`: `RepositoryListItemSchema` и `RepositoryListSchema` по `RepositoryListResponse` с `MatchesContract`; `fetchRepositories`, `disconnectRepository`; удалить `AvailableRepository*` и `fetchAvailableRepositories`
- [x] 1.3 `ApiTransport.delete` в HTTP-клиенте, mock adapter и `fakeTransport`
- [x] 1.4 `features/repository`: `useRepositories`, `useConnectRepository` (`409` с `REPOSITORY_ALREADY_CONNECTED` — успех), `useDisconnectRepository`, инвалидация списка в `onSettled`; удалить `useAvailableRepositories`
- [x] 1.5 Схема находки — поле `covered_by_finding_id` из контракта
- [x] 1.6 `fetchRepositories` собирает страницы по `offset += 200`; мутации с `mutationKey`, спиннер строки — `useMutationState` (`usePendingReviewToggles`)

## 2. Страницы

- [x] 2.1 «Репозитории»: колонка «Ревью» с переключателем, подтверждение выключения, «Настройки» у строк с `id`, кнопка по `install_url`, ссылка «Управлять доступом в GitHub», подсказка, пустой список, итог возврата с GitHub
- [x] 2.2 Удалить `ConnectRepositoryPage`, маршрут `/repositories/connect`, пункт меню и кнопку на «Обзоре»
- [x] 2.3 Убрать свитчер «Авто-ревью» из настроек, флаг в `PUT` — сохранённый
- [x] 2.4 «Обзор» — число подключённых; фильтр вкладки «Ревью» — строки с `id`
- [x] 2.5 Поиск по имени (`q`) и фильтр «Только включённые» (`only=enabled`) на «Репозиториях», на клиенте

## 3. Моки и тесты

- [x] 3.1 Моки списка: подключён, не подключён, нет прав, выключен с `id`; `POST`/`DELETE` как в контракте
- [x] 3.2 Тесты: переключатель вкл/выкл, `409` с `REPOSITORY_ALREADY_CONNECTED` и `204` — успех, другой `409` — ошибка, неактивный без прав, кнопка по `install_url`, пустое состояние, итог возврата и очистка URL, нет страницы подключения и пункта меню, нет свитчера «Авто-ревью», поиск и фильтр в URL
- [x] 3.3 `pnpm run typecheck`, `lint`, `stylelint`, `format:check`, `test`, `api:check`; `openspec validate --all --strict`
