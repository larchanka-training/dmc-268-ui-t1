# Tasks

## 1. Подготовка и модели

- [x] 1.1 Создать ветку `feat/repository-settings` от `develop`, change `repository-settings` и задачу [#28](https://github.com/larchanka-training/dmc-268-ui-t1/issues/28); проверить: `openspec status --change repository-settings` показывает артефакты, карточка на доске `dmc-268-t1`
- [x] 1.2 Завести `entities/repository/model/settings.ts`: типы и Zod-схемы `RepositorySettings`, `RulesStatus`, `HistoryRun` по design.md; тесты схем — пресеты severity, вариант правил без файла, незнакомый статус прогона, данные вне схемы; `pnpm run test` зелёный
- [x] 1.3 Расширить `entities/repository/api/mockStore.ts`: настройки, статус правил, история и `saveRepositorySettings`; фикстуры — `repo-1` с `.review/rules.md` (секции Security, Performance, Style, директива ignore) и историей прогонов, `repo-2` без правил и с пустой историей; тест — сохранение меняет состояние store

## 2. API-функции и запросы

- [x] 2.1 Добавить в `entities/repository/api/repositoryApi.ts` fetch-функции настроек, статуса правил и истории и `saveRepositorySettings` с задержкой по образцу существующих; экспорт через публичный `index.ts` слайса; `pnpm run typecheck` без ошибок
- [x] 2.2 Расширить `features/repository/model/repositoryQueries.ts`: ключи `['repositories', id, 'settings' | 'rules' | 'history']`, hooks `useRepositorySettings`, `useRulesStatus`, `useRepositoryHistory`, mutation `useSaveRepositorySettings` с инвалидацией настроек; поведение проверяется интеграционными тестами страницы в 4.3

## 3. UI сущностей

- [x] 3.1 Сделать `entities/repository/ui/RulesStatusBadge.tsx` и `RulesPreview.tsx`: бейдж «кастомные/дефолтные правила», ветка и путь файла, секции с пунктами и тегами ignore, предупреждение «Используются дефолтные правила, создайте `.review/rules.md`»; компонентные тесты — правила найдены, правил нет, в превью нет полей ввода

## 4. Страница и маршрут

- [x] 4.1 Собрать `src/pages/RepositorySettingsPage.tsx`: форма настроек (авто-ревью, фильтр веток, порог severity с подписями All / Warn & Crit / Only Critical), панель статуса правил, таблица истории со ссылкой на `/reviews/:reviewId`; блоки отдельно переживают загрузку и ошибку, экран показывает «репозиторий не найден», сброс возвращает сохранённые значения
- [x] 4.2 Прописать маршрут `/repositories/:repositoryId/settings` в `AppRouter` и действие «Настройки» в `RepositoriesPage`; тест — из списка репозиториев открывается экран настроек
- [x] 4.3 Интеграционные тесты `RepositorySettingsPage`: загрузка текущих значений, сохранение (успех, ошибка с сохранением черновика, сброс), правила есть/нет, переход на прогон, пустая история, незнакомый статус прогона, ошибка одного блока не ломает остальные, данные вне схемы

## 5. Проверки и доставка

- [x] 5.1 Прогнать гейты: `pnpm run typecheck`, `pnpm run lint`, `pnpm run stylelint`, `pnpm run format:check`, `pnpm run test` — все зелёные
- [ ] 5.2 Открыть PR из `feat/repository-settings` в `develop`: осмысленные заголовок и описание (первый контекст для ревью-бота), `Closes #28`, запросить ревью у всей команды
