# Proposal

## Why

Задача [#28](https://github.com/larchanka-training/dmc-268-ui-t1/issues/28): экран настроек
репозитория, статус-панель `.review/rules.md` и история проверок (frontend-sub родителя, его
backend-sub — контракт ручек). Definition of Done: в настройках репозитория отображается
актуальный статус и предпросмотр `.review/rules.md` из подключенного репозитория. Ручки блока
уже описаны контрактом `b035f3e` (бэкенд-задача api#113 закрыта, контракт влит во фронт в
PR #56): `GET /api/v1/repositories/{repository_id}` реализована, `GET`/`PUT …/settings` и
`GET …/rules` — заглушки `501 NOT_IMPLEMENTED`, `GET /api/v1/reviews` с фильтром
`repository_id` — заглушка (задача #103). Поэтому экран работает через `ApiTransport` на
mock adapter с той же границей, что HTTP-клиент (FE-DEC-06), а блок на 501 показывает «пока
недоступно» — как экран подключения и вкладка «Ревью».

## What Changes

- Страница `/app/repositories/:repositoryId/settings` за `RequireAuth` + `AppLayout`; вход со
  страницы репозиториев действием «Настройки» — ссылкой-кнопкой `LinkButton` (настоящий
  `<a href>`, без `<button>` внутри `<a>`).
- Форма настроек ревью по полям контракта (`RepositorySettingsResponse`): включение
  авто-ревью `auto_review_enabled`, фильтр веток `branch_filter` (список glob-паттернов),
  порог `min_severity` из `FindingSeverity` — low/medium/high/critical с подписями Low /
  Medium / High / Critical. Сохранение — один mutation: `PUT …/settings` полной заменой,
  тело — все три поля; перед отправкой фильтр веток нормализуется (обрезка пробелов, пустые —
  мимо, без повторов). При смене репозитория блоки перемонтируются (`key={repositoryId}`) —
  черновик одного репозитория не показывается у другого.
- Панель статуса правил: бейдж одного из пяти исходов `RulesStatusResponse` — правила
  загружены, файл разобран без применимых правил (`empty`), файла нет, слишком большой,
  недоступен — и превью распарсенных правил read-only: имя, паттерны `pattern`/`exclude`,
  нумерованные проверки, отклонённые разделы с причиной; предупреждение «Используются
  дефолтные правила, создайте `.review/rules.md`», когда файла нет.
- История проверок: первая страница списка прогонов `GET /api/v1/reviews` с фильтром
  `repository_id` (поля `ReviewRunListItem` — та же ручка, что у вкладки «Ревью»); выбор
  прогона открывает `/reviews/:reviewId`; если `total` больше показанного — ссылка на вкладку
  «Ревью» с фильтром по репозиторию.
- Модели — схемы контракта поле в поле (snake_case, `MatchesContract`), история — без
  отдельной модели. Моки отвечают по ручкам контракта (`app/mocks/repositorySettings.ts`,
  маршруты `mockAdapter.ts`); `ApiTransport` расширен методом `put`; парсинг markdown
  остаётся на бэкенде.

**Не входит**: реализация ручек бэкендом (заглушки 501; `GET /reviews` — задача #103) и
переключение стенда на HTTP, редактирование `.review/rules.md`, SSE и реальное время (#20),
basename `/app` (#27), тесты бэкенда.

## Capabilities

### New Capabilities

- `cabinet-repository-settings`: экран настроек репозитория в кабинете — форма настроек ревью
  (авто-ревью, фильтр веток, порог severity) с сохранением PUT полной заменой, статус-панель
  `.review/rules.md` с read-only превью распарсенных правил и история проверок первой
  страницей списка прогонов с переходом на экран прогона; данные — через `ApiTransport`
  (mock adapter по ручкам контракта) и TanStack Query.

### Modified Capabilities

Нет: capability новая, требования существующих (`cabinet-repositories`, `cabinet-reviews` и
др.) не меняются.

## Impact

- Код: `src/pages/RepositorySettingsPage.tsx`, `src/app/router/AppRouter.tsx`,
  `src/pages/RepositoriesPage.tsx` (действие «Настройки» — `LinkButton`), `src/entities/repository`
  (модели настроек и статуса правил + Zod-схемы по контракту, `lib/branchFilter.ts`, UI бейджа
  и превью, API-функции по ручкам контракта), `src/features/repository` (queries и mutation),
  `src/shared/api` (транспорт с методом `put`, `isNotImplemented`), `src/shared/ui`
  (`ErrorState`, `LinkButton`), моки `src/app/mocks/` (`repositorySettings.ts`, маршруты
  `mockAdapter.ts`).
- Зависимости: новых нет — хватает antd, TanStack Query и Zod.
- Бэкенду (`dmc-268-api-t1`): нового PR не нужно — ручки и схемы уже в контракте `b035f3e`
  (задача api#113); реализация заглушек `settings`/`rules` и `GET /reviews` (задача #103) —
  за бэкендом, экран встретит реальные ответы без переделки.
- Задача: родитель [#28](https://github.com/larchanka-training/dmc-268-ui-t1/issues/28);
  контракт — закрытая бэкенд-задача api#113; PR закрывает frontend-sub-issue родителя.
