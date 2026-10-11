# Proposal

## Why

Задача Инженера 1 (Frontend — Settings & Repo Config) —
[#28](https://github.com/larchanka-training/dmc-268-ui-t1/issues/28): экран настроек
репозитория, статус-панель `.review/rules.md` и история проверок. Definition of Done: в
настройках репозитория отображается актуальный статус и предпросмотр `.review/rules.md` из
подключенного репозитория. Кабинет уже собран (PR #16, change `cabinet-mock-oauth`), а
эндпоинтов для правки настроек, статуса правил и списка прогонов в API ещё нет — за ними
задачи Инженеров 3 и 5. Поэтому экран строится на mock adapter с границей будущего HTTP-клиента
(FE-DEC-06), как кабинет и экран прогона.

## What Changes

- Страница `/repositories/:repositoryId/settings` за `RequireAuth` + `AppLayout`; вход со
  страницы репозиториев действием «Настройки».
- Форма настроек ревью: включение авто-ревью, фильтр веток (список glob-паттернов), порог
  severity — пресеты `all | warn_and_critical | critical_only` (All / Warn & Crit / Only
  Critical). Сохранение — mutation с инвалидацией кэша.
- Панель статуса правил: бейдж наличия `.review/rules.md` в ветке репозитория, превью
  распарсенных правил read-only по секциям (`# Security`, `# Performance`, `# Style`, директивы
  игнорирования) и предупреждение «Используются дефолтные правила, создайте `.review/rules.md`»,
  когда файла нет.
- История проверок: таблица прогонов ревью репозитория с переходом на существующий экран
  `/reviews/:reviewId`.
- Модели `RepositorySettings`, `RulesStatus` и `HistoryRun` — mock-расширения и предложение
  контракта бэкенду, а не согласованный API. Парсинг markdown-правил остаётся на бэкенде
  (Инженер 3): adapter отдаёт уже распарсенные секции.

**Не входит**: HTTP-клиент для настроек и правил, редактирование `.review/rules.md`, SSE и
реальное время (#20), basename `/app` (#27), тесты бэкенда для контрактов.

## Capabilities

### New Capabilities

- `cabinet-repository-settings`: экран настроек репозитория в кабинете — форма настроек ревью
  (авто-ревью, фильтр веток, порог severity), статус-панель `.review/rules.md` с read-only
  превью распарсенных правил и история проверок с переходом на экран прогона; данные — mock
  adapter через TanStack Query.

### Modified Capabilities

Нет — `openspec/specs/` пока пуст, кабинет ещё не архивирован из change `cabinet-mock-oauth`.

## Impact

- Код: `src/pages/RepositorySettingsPage.tsx`, `src/app/router/AppRouter.tsx`,
  `src/pages/RepositoriesPage.tsx` (действие «Настройки»), `src/entities/repository`
  (модели настроек, статуса правил и истории + Zod-схемы, UI бейджа и превью),
  `src/features/repository` (queries и mutation), mockStore в `src/entities/repository/api`.
- Зависимости: новых нет — хватает antd, TanStack Query и Zod.
- Бэкенду (`dmc-268-api-t1`): открытые вопросы — изменение настроек репозитория, эндпоинт
  статуса и превью `.review/rules.md`, список прогонов по репозиторию (сейчас есть только
  `GET /api/v1/reviews/{id}`), маппинг пресетов severity на четыре уровня модели
  (`low | medium | high | critical`).
- Задача: [#28](https://github.com/larchanka-training/dmc-268-ui-t1/issues/28); в PR — `Closes #28`.
