# Proposal

## Why

Задача [#96](https://github.com/larchanka-training/dmc-268-ui-t1/issues/96), frontend-часть
[#95](https://github.com/larchanka-training/dmc-268-ui-t1/issues/95): пользователь сам ставит
приложение на свои репозитории, в том числе приватные, и сам включает и выключает в них ревью
на одной странице «Репозитории». Контракт — PR бэкенда
[dmc-268-api-t1#247](https://github.com/larchanka-training/dmc-268-api-t1/pull/247)
(change `repositories-one-list`): `GET /repositories` отдаёт все репозитории установок,
подключённые и нет, с `connected`, `id`, `can_connect` и `install_url`;
`GET /repositories/available` удалён; `DELETE /repositories/{id}` выключает ревью (пока
`501`); `GET /auth/github/setup` уводит на «Репозитории» с итогом в query. Схема и тексты —
`docs/GITHUB_APP.md` бэкенда, раздел «Подключение → После #243».

## What Changes

- **Одна страница «Репозитории»** по `GET /repositories`: все строки, колонка «Ревью» с
  переключателем, «Настройки» у строк с `id` (в том числе у выключенных — история остаётся).
- **Переключатель:** вкл — `POST /repositories`, выкл — подтверждение и
  `DELETE /repositories/{id}`. `409` при включении и `204` при выключении — успех; `501` у
  `DELETE` — «Выключение ревью пока недоступно». После мутации список перезапрашивается. Без
  admin или maintain (`can_connect: false`) переключатель неактивен с подсказкой.
- Сверху — **«Добавить репозитории из GitHub»** (`install_url`) и ссылка **«Управлять
  доступом в GitHub»**, под ними подсказка про ревью и доступ бота. Пустой список — подсказка
  и крупная кнопка «Добавить».
- **Поиск и фильтр:** поиск по имени в `q` и «Только включённые» в `only=enabled`, на
  клиенте по загруженному списку. Без них при «All repositories» пришлось бы листать сотни
  строк. Ничего не нашлось: «Ничего не найдено».
- **Возврат с GitHub:** итог `connected` / `requested` / `setup_error` из query —
  сообщением, параметры убираются из URL.
- **Удаляется** страница `/repositories/connect`, пункт меню и кнопки «Подключить
  репозиторий», `useAvailableRepositories`, `fetchAvailableRepositories`, моки
  `/repositories/available`.
- **Убирается свитчер «Авто-ревью»** из настроек репозитория и колонка «Автоматическое
  ревью» со страницы «Репозитории»: пока бот запускается только автоматически, он дублирует
  «Ревью». Вернётся с запуском по назначению ревьюером или упоминанию.
- `ApiTransport` получает `delete`. «Обзор» считает только подключённые, фильтр «Репозиторий»
  вкладки «Ревью» — строки с `id`.
- Контракт временно на коммите PR бэкенда `8366bc9` (голова стопки api#247 → #248 → #252): `pnpm api:check` не пропустит его в мёрж
  до мёржа бэкенда, затем `pnpm api:sync` с головы `develop`. Заодно из контракта пришло поле
  `covered_by_finding_id` у находки (уже в `develop` бэкенда) — добавлено в схему находки.

## Capabilities

### Modified Capabilities

- `cabinet-repositories` — одна страница со всеми репозиториями и переключателем вместо
  списка подключённых и страницы подключения.
- `cabinet-repository-settings` — без свитчера «Авто-ревью».

## Impact

- `src/entities/repository`, `src/features/repository`, `src/pages/RepositoriesPage.tsx`,
  `src/pages/OverviewPage.tsx`, `src/pages/RepositorySettingsPage.tsx`,
  `src/pages/reviews/ui/ReviewFilters.tsx`, `src/widgets/app-shell`, `src/app/router`,
  `src/app/mocks`, `src/shared/api` (метод `delete`), контракт.
- Окно на стенде: между мёржем бэкенда и этого PR страница «Репозитории» не работает (старый
  фронт ждёт `/available`), поэтому фронт мёржится сразу за бэкендом.
