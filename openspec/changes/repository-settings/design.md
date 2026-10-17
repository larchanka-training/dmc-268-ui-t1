# Design

## Context

Кабинет уже собран (change `cabinet-mock-oauth`, PR #16): `AppRouter` с `RequireAuth` +
`AppLayout`, плоские страницы в `src/pages`, `entities/repository` с mockStore и типами в
стиле camelCase, `features/repository/model/repositoryQueries.ts` с ключами
`['repositories', 'connected' | 'available']`. Реальный HTTP есть только в auth. Контрактов
для настроек, статуса `.review/rules.md` и списка прогонов в бэкенде нет (см. proposal →
Why), поэтому данные — mock с той же границей, что будущий HTTP-клиент (FE-DEC-06). Парсинг
markdown-правил — задача бэкенда (Инженер 3): adapter отдаёт уже распарсенные правила, их
форма повторяет домен api#49 (`RepoRule`, `RejectedRule`, `RulesStatus`). Экран
прогона `/reviews/:reviewId` уже существует и принимает произвольный id.

## Goals / Non-Goals

**Goals:**

- Три блока одного экрана — форма настроек, статус правил, история — за общим mock adapter с
  Zod-валидацией на границе.
- Настройки по смыслу совпадают с полями бэкенда (`auto_review_enabled` уже приходит в
  `GET /api/v1/repositories`), чтобы будущий HTTP-adapter менял только транспорт.
- Превью правил без парсинга markdown во фронтенде.
- История переиспользует сущность прогона: статус рендерится существующим бейджем статуса.

**Non-Goals:**

- HTTP-клиент, SSE, редактирование `.review/rules.md` — вне этого change.
- Глубокая валидация glob-паттернов фильтра веток: формат строки, семантику проверяет бэкенд.
- Пагинация истории и настройка её глубины — добавится с контрактом списка прогонов.

## Decisions

### Маршрут и композиция — плоская страница, без новых виджетов

`/repositories/:repositoryId/settings`, страница `src/pages/RepositorySettingsPage.tsx` —
плоско, как страницы кабинета, а не в подкаталоге. Каждый блок достаточно прост (форма antd,
панель и таблица), поэтому виджеты не заводим: страница компонует `features/repository` и
`entities/repository` напрямую. Рассмотрели `widgets/repository-settings` — отклонено: между
страницей и блоками нет композиции нескольких слайсов одного слоя, лишний слой только
добавил бы переэкспорты.

### Модели — mock-расширения в camelCase рядом с репозиторием

```ts
type SeverityLevel = 'low' | 'medium' | 'high' | 'critical' // FindingSeverity бэкенда, #28
type RepositorySettings = {
  autoReviewEnabled: boolean
  branchFilter: string[] // glob-паттерны, например 'feature/**'
  minSeverity: SeverityLevel // min_severity бэкенда; дефолт critical, пока настроек нет
}
type RepoRule = {
  name: string // раздел `##` в rules.md
  patterns: string[] // glob области действия
  excludes: string[] // glob исключения
  checks: string[] // нумерованные проверки
}
type RejectedRule = { name: string; reason: string }
type RulesLoadStatus = 'loaded' | 'absent' | 'too_large' | 'unavailable' // RulesStatus api#49
type RulesStatus =
  | {
      status: 'loaded'
      branch: string
      path: string
      rules: RepoRule[]
      rejected: RejectedRule[]
      fetchedAt: string
    }
  | { status: 'absent' | 'too_large' | 'unavailable'; branch: string; path: string }
type HistoryRun = {
  id: string // ведёт на /reviews/:reviewId
  number: number
  title: string
  sourceBranch: string
  status: string // строка, как у ReviewRun.status
  createdAt: string
}
```

Стиль — как у `ConnectedRepository` кабинета: camelCase на границе entity, будущий HTTP-adapter
смаппит `snake_case` ответа (`auto_review_enabled` → `autoReviewEnabled`) при парсинге. Статус
прогона в истории — открытая строка: известные значения получают подпись существующего бейджа,
незнакомые показываются как есть. Порог severity — уровни модели бэкенда
(`low | medium | high | critical`) без маппинга пресетов: согласовано в #28, merge gate (api#51)
и вердикт «запрос изменений» (api#54) читают один `min_severity` репозитория; дефолт —
`critical`, пока настроек нет.

### Расположение по FSD

- `entities/repository/model/settings.ts` — типы и Zod-схемы настроек, статуса правил и
  истории; `ui/RulesStatusBadge.tsx`, `ui/RulesPreview.tsx` — отображение бейджа и превью;
  расширение `api/mockStore.ts` (хранилище настроек, статуса правил и истории, функция
  сохранения) и `api/repositoryApi.ts` (fetch/save-функции с задержкой, как существующие).
- `features/repository/model/repositoryQueries.ts` — ключи
  `['repositories', id, 'settings' | 'rules' | 'history']` и mutation
  `useSaveRepositorySettings` с инвалидацией ключа настроек. Список подключённых репозиториев
  остаётся источником имени и ветки по умолчанию.
- История ссылается на `/reviews/:reviewId`; рендер статуса — публичный `RunStatusBadge` из
  `entities/review-run`, новая копия подписей не заводится.

Рассмотрели отдельные слайсы `entities/rules` и `entities/review-history` — отклонено: ни
правил, ни истории не существует без репозитория, а кабинет уже держит всё репозиторное в
одном слайсе.

### Черновик формы — локальное состояние, кэш — только сохранённое

Несохранённый черновик живёт в antd `Form` (локальное состояние экрана), TanStack Query хранит
только сохранённые настройки. Zustand не заводим: значение нужно одному экрану. На время
мутации форма блокируется: `isPending` длится до прихода инвалидированных данных, поэтому
правки в момент сохранения невозможны, а после разблокировки форма синхронизируется уже со
свежим кэшем. При ошибке черновик остаётся нетронутым.

### Превью правил — текст и теги, без HTML

Adapter отдаёт распарсенные правила; проверки рендерятся текстом через существующий
`TextWithCode` (инлайн-код — моноширинно), паттерны `pattern`/`exclude` — моноширинными чипами,
отклонённые разделы — отдельным блоком с причиной из `RejectedRule.reason`. `loaded` без
применимых правил — дефолтный фоллбэк: сообщение про стандартные критерии плюс отклонённые
разделы с причинами. Read-only достигается отсутствием полей ввода. Рассматривали рендер
raw markdown библиотекой — отклонено при планировании: «превью распарсенных правил» из
задачи, и парсинг остаётся на бэкенде.

### Фикстуры

`repo-1` (`platform-api`) — с `.review/rules.md`: три правила (`Security`, `Performance`,
`Style`) в форме api#49 и один отклонённый раздел; история из нескольких прогонов со всеми
статусами. `repo-2` (`docs`) — без файла правил (сценарий предупреждения) и с пустой историей.
`repo-3` (`design-system`) — файл правил есть, но применимых правил нет: оба раздела
отклонены, сценарий «правила не применяются». Исходы `too_large`/`unavailable` не заводятся
отдельными репозиториями — их покрывают тесты компонентов. Настройки у репозиториев
различаются, чтобы форма не выглядела константой.

## Risks / Trade-offs

- [Mock-модель разойдётся с контрактом бэкенда] → модель правил повторяет домен api#49
  (`RepoRule`, `RejectedRule`, четыре исхода загрузки); схемы собраны в одном месте
  (`entities/repository/model`), при появлении HTTP меняется только adapter; оставшиеся
  расхождения зафиксированы как open questions в #28.
- [Порог `min_severity` — контракт настроек ещё не принят бэкендом] → модель повторяет
  согласованное в #28 решение (уровни `FindingSeverity`, дефолт `critical`), при появлении
  HTTP меняется только adapter.
- [История без пагинации] → данных мало, ключ запроса позволяет добавить пагинацию позже без
  смены экрана.
- [Refetch затирает черновик формы] → форма инициализируется из кэша один раз, обновляется
  только вне черновика, а на время сохранения блокируется — форма и кэш не расходятся.

## Migration Plan

Новый экран, ничего не выключается: откат — удалить маршрут и страницу. Данные mockStore
существуют только в памяти сессии и не требуют миграции.

## Open Questions

- Форма контрактов: изменение настроек репозитория, статус и превью `.review/rules.md`, список
  прогонов по репозиторию — к #28, решают Инженеры 3 и 5.
- Из какой ветки берётся статус правил: сейчас ветка по умолчанию репозитория; возможен
  вариант «целевая ветка PR».
