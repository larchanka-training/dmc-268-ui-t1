# Tasks

## 1. Подготовка и модели

- [x] 1.1 Создать ветку `feat/repository-settings` от `develop`, change `repository-settings` и задачу [#28](https://github.com/larchanka-training/dmc-268-ui-t1/issues/28); проверить: `openspec status --change repository-settings` показывает артефакты, карточка на доске `dmc-268-t1`
- [x] 1.2 Завести `entities/repository/model/settings.ts`: Zod-схемы настроек и статуса правил по контракту с `MatchesContract` против `RepositorySettingsResponse`, `RulesStatusResponse`, `FindingSeverity` — пять исходов правил `loaded`/`empty`/`absent`/`too_large`/`unavailable`; тесты схем — уровни severity, исходы правил, данные вне схемы; `pnpm run test` зелёный
- [x] 1.3 Завести моки по ручкам контракта: `app/mocks/repositorySettings.ts` — стор настроек и статуса правил с `onAutoReviewChange` (синхронизация флага авто-ревью в стор репозиториев, как у бэкенда), маршруты `mockAdapter.ts` — `GET`/`PUT …/settings` и `GET …/rules`; фикстуры — `repo-1` с `.review/rules.md` (правила Security, Performance, Style и отклонённый раздел Docs), `repo-2` без файла (absent), `repo-3` — исход `empty`; тест — сохранение меняет стор и синхронизирует `auto_review_enabled` (`repositorySettings.test.ts`)

## 2. API-функции и запросы

- [x] 2.1 Добавить в `entities/repository/api/repositoryApi.ts` `fetchRepository` (`GET /repositories/{id}`), `fetchRepositorySettings`/`saveRepositorySettings` (`GET`/`PUT …/settings`, тело — `RepositorySettingsUpdate`) и `fetchRulesStatus` (`GET …/rules`) через `ApiTransport`; экспорт через публичный `index.ts` слайса; `pnpm run typecheck` без ошибок
- [x] 2.2 Расширить `features/repository/model/repositoryQueries.ts`: ключи `['repositories', id, 'settings' | 'rules']`, hooks `useRepository`, `useRepositorySettings`, `useRulesStatus`; mutation `useSaveRepositorySettings` кладёт ответ в кэш (`setQueryData`) и инвалидирует `settings`, `repository` и `connected`; поведение проверяется интеграционными тестами страницы в 4.3

## 3. UI сущностей

- [x] 3.1 Сделать `entities/repository/ui/RulesStatusBadge.tsx` и `RulesPreview.tsx`: бейдж исхода загрузки (загружены, файла нет, слишком большой, недоступен), ветка и путь файла, правила с паттернами `pattern`/`exclude` и нумерованными проверками, отклонённые разделы с причиной, предупреждение «Используются дефолтные правила, создайте `.review/rules.md`»; компонентные тесты — все исходы загрузки, в превью нет полей ввода

## 4. Страница и маршрут

- [x] 4.1 Собрать `src/pages/RepositorySettingsPage.tsx`: форма настроек (авто-ревью, фильтр веток, порог severity `min_severity` с подписями Low / Medium / High / Critical), панель статуса правил, ссылка «Прогоны репозитория» на вкладку «Ревью» с фильтром по репозиторию; блоки отдельно переживают загрузку и ошибку, экран показывает «репозиторий не найден», сброс возвращает сохранённые значения
- [x] 4.2 Прописать маршрут `/app/repositories/:repositoryId/settings` (под `basename="/app"`) в `AppRouter` и действие «Настройки» в `RepositoriesPage`; тесты — из списка репозиториев открывается экран настроек и прямая ссылка без сессии уводит на `/login?redirect=…`
- [x] 4.3 Интеграционные тесты `RepositorySettingsPage`: загрузка текущих значений, сохранение (успех, ошибка с сохранением черновика, сброс), правила есть/нет, черновик не переезжает между репозиториями, 501 блоков, 404/4xx без повтора, ссылка на прогоны, ошибка одного блока не ломает остальные, данные вне схемы

## 5. Проверки и доставка

- [x] 5.1 Прогнать гейты: `pnpm run typecheck`, `pnpm run lint`, `pnpm run stylelint`, `pnpm run format:check`, `pnpm run test` — все зелёные
- [x] 5.2 Открыть PR из `feat/repository-settings` в `develop`: осмысленные заголовок и описание (первый контекст для ревью-бота), `Closes #28`, запросить ревью у всей команды

## 6. Переработка по ревью PR #29

Ревью PR #29 (треды AndrewKonst): экран работал в обход контракта, артефакты описывали
архитектуру до него. Ручки блока появились в контракте `b035f3e` (бэкенд-задача api#113, влит
во фронт PR #56) — часть заглушками `501`, поэтому экран переработан под контракт.

- [x] 6.1 Перевести модели на типы контракта: поля snake_case, `MatchesContract` против
      `RepositorySettingsResponse`, `RulesStatusResponse`, `FindingSeverity`, тело сохранения —
      `RepositorySettingsUpdate`; добавить `ApiTransport.put` (`shared/api/transport.ts`,
      `http.ts`, `fakeTransport`); `HistoryRun` и мок-ручка `/repositories/{id}/history`
      удалены
- [x] 6.2 Сохранение — `PUT` полной заменой (`saveRepositorySettings` через `transport.put`);
      нормализация `branch_filter` при сохранении (`lib/branchFilter.ts`: трим, пустые — мимо,
      дедуп, лимиты 50/200)
- [x] 6.3 Заголовок экрана — `useRepository` по одной ручке `GET /repositories/{id}`, без
      поиска в первой странице списка; карточка истории по решению созвона убрана
      (см. раздел 7)
- [x] 6.4 501 от ручек-заглушек → «пока недоступно» в этом блоке (`NotImplementedNote`,
      паттерн `ConnectRepositoryPage`/`ReviewsPage`); блоки ошибок — `ErrorState`, «Повторить»
      только для не-4xx; 404 заголовка — `Result` с инвалидацией `connected`
- [x] 6.5 Ссылки-кнопки — `shared/ui/LinkButton` (настоящий `<a href>`, без `<button>` внутри
      `<a>`); `aria-label` у Radio.Group «Порог severity» и у действия «Настройки» в списке
      репозиториев
- [x] 6.6 Один источник `auto_review_enabled`: флаг — колонка `RepositoryResponse`; после
      сохранения `setQueryData` ответа + инвалидация `settings`/`repository`/`connected`;
      мок-стор синхронизирует флаг через `onAutoReviewChange`, как бэкенд
- [x] 6.7 Черновик формы не переезжает между репозиториями: блоки с `key={repositoryId}`
- [x] 6.8 Тесты под новое поведение: модели (пять исходов правил), API-функции (PUT),
      моки (`repositorySettings.test.ts`), страница (501, 404, черновик, radiogroup,
      нормализация tags, сценарий упавшего рефетча после сохранения, фоновая ошибка блока);
      новый `src/app/mocks/mockAdapter.test.ts`; весь `pnpm run test` зелёный
- [x] 6.9 Дедупликация `isNotImplemented`: локальные копии заменены импортом из
      `@/shared/api`
- [x] 6.10 Актуализировать артефакты change: `design.md`, `proposal.md`, `tasks.md` и дельта
      `specs/cabinet-repository-settings/spec.md` — архитектура после перехода на контракт;
      `openspec validate repository-settings --strict` зелёный

## 7. Правки по повторному ревью 24.10

Ревью головы `9dde444` (треды Grinv, AndrewKonst): карточка «История проверок» противоречит
решению созвона — журнал прогонов живёт на вкладке «Ревью» (#43; frontend #44, backend
api-t1#103), а не в настройках репозитория; пункты 1.2–2.2 описывали архитектуру до
перехода на контракт.

- [x] 7.1 Убрать карточку «История проверок» и всё под неё: `HistoryTable`,
      `useRepositoryHistory`/`repositoryHistoryKey`, требование «История проверок» из спеки,
      тесты истории, упоминания в proposal и design; вместо карточки — ссылка «Прогоны
      репозитория» на `/app/reviews?repository_id={id}` в тулбаре страницы
- [x] 7.2 Переписать пункты 1.2–2.2 под фактическую реализацию — схемы контракта с
      `MatchesContract`, моки `app/mocks/repositorySettings.ts` и маршруты `mockAdapter.ts`,
      API-функции через `ApiTransport`, ключи `settings`/`rules`;
      `openspec validate repository-settings --strict` зелёный
