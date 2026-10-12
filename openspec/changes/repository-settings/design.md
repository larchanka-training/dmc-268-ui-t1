# Design

## Context

Кабинет уже собран (change `cabinet-mock-oauth`, PR #16): `AppRouter` с `RequireAuth` +
`AppLayout`, плоские страницы в `src/pages`, `entities/repository` с mockStore и типами в
стиле camelCase, `features/repository/model/repositoryQueries.ts` с ключами
`['repositories', 'connected' | 'available']`. Реальный HTTP есть только в auth. Контрактов
для настроек, статуса `.review/rules.md` и списка прогонов в бэкенде нет (см. proposal →
Why), поэтому данные — mock с той же границей, что будущий HTTP-клиент (FE-DEC-06). Парсинг
markdown-правил — задача бэкенда (Инженер 3): adapter отдаёт уже распарсенные секции. Экран
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
type SeverityThreshold = 'all' | 'warn_and_critical' | 'critical_only'
type RepositorySettings = {
  autoReviewEnabled: boolean
  branchFilter: string[] // glob-паттерны, например 'feature/**'
  severityThreshold: SeverityThreshold
}
type RuleEntry = { kind: 'rule' | 'ignore'; text: string }
type RuleSection = { title: string; entries: RuleEntry[] }
type RulesStatus =
  | { present: true; branch: string; path: string; sections: RuleSection[]; fetchedAt: string }
  | { present: false; branch: string; path: string }
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
незнакомые показываются как есть. Рассмотрели порог severity уровнями модели бэкенда
(`low | medium | high | critical`) — отклонено: в задаче три пресета, маппинг пресетов на уровни
не согласован (open question), UI хранит ровно то, что выбирает пользователь.

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

Adapter отдаёт распарсенные секции; пункты рендерятся текстом через существующий `TextWithCode`
(инлайн-код — моноширинно), директивы игнорирования помечаются тегом «ignore». Read-only
достигается отсутствием полей ввода. Рассматривали рендер raw markdown библиотекой —
отклонено при планировании: «превью распарсенных правил» из задачи, и парсинг остаётся на
бэкенде.

### Фикстуры

`repo-1` (`platform-api`) — с `.review/rules.md`: три секции (`Security`, `Performance`,
`Style`), среди пунктов директива игнорирования; история из нескольких прогонов со всеми
статусами. `repo-2` (`docs`) — без файла правил (сценарий предупреждения) и с пустой историей.
Настройки у репозиториев различаются, чтобы форма не выглядела константой.

## Risks / Trade-offs

- [Mock-модель разойдётся с контрактом бэкенда] → схемы собраны в одном месте
  (`entities/repository/model`), при появлении HTTP меняется только adapter; расхождения
  зафиксированы как open questions в #28.
- [Маппинг пресета `warn_and_critical` на четыре уровня severity не согласован] → UI хранит
  enum из трёх значений и человекочитаемые подписи; смена маппинга не меняет экран.
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
- Маппинг `warn_and_critical` на уровни модели (`medium+high+critical` или `high+critical`) —
  принимается вместе с контрактом настроек.
- Из какой ветки берётся статус правил: сейчас ветка по умолчанию репозитория; возможен
  вариант «целевая ветка PR».
