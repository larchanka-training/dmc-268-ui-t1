# Tasks

## 1. Контракт и схемы

- [x] 1.1 `pnpm api:sync` на коммит PR бэкенда dmc-268-api-t1#115
- [x] 1.2 `ReviewRunListItemSchema`, `RUN_EVENT_TYPES`, `applyRunEvent` с правилом `updated_at` в `entities/review-run`; `MatchesContract` с `ReviewRunListItem` и `StreamEventType`
- [x] 1.3 Удалить `RunStatusEventSchema` и `applyStatusEvent`

## 2. Подписка

- [x] 2.1 `useRunLiveStatus`: путь `/api/v1/events`, фильтр по `data.id` и типу `run.*`, незнакомые типы — молча
- [x] 2.2 Перезапрос прогона на каждое `open` потока
- [x] 2.3 `run.finished`: патч, перезапрос, закрытие подписки
- [x] 2.4 `createEventSourceStream` со списком типов от приложения

## 3. Mock и тесты

- [x] 3.1 Mock-поток на новом пути, без снимка, с событиями чужого прогона и незнакомого типа
- [x] 3.2 Тесты хука: свой и чужой прогон, незнакомый тип, событие старше кэша, снимок после `open` и переподключения, `run.finished`, терминальный статус без подписки
- [x] 3.3 Тесты `EventStream`, mock-потока, экрана прогона (INT-23) и приложения

## 4. Проверки

- [x] 4.1 `typecheck`, `lint`, `stylelint`, `format:check`, `test`, `api:check`, `spec:validate`
- [x] 4.2 Перед мёржем — `pnpm api:sync` на коммит из `develop` бэкенда (233381f, #115)
