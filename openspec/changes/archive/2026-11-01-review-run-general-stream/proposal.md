# Proposal

## Why

Бэкенд заменяет поток одного прогона `GET /api/v1/reviews/{id}/events` общим потоком кабинета `GET /api/v1/events` (dmc-268-api-t1#103, контракт и реализация — dmc-268-api-t1#115). Поток один на всех, без параметров: события называются `<ресурс>.<действие>`, у `run.*` данные — `ReviewRunListItem`, а снимка в начале соединения больше нет. После выката фронта бэкенд удаляет старую ручку, поэтому экран прогона переходит на новый поток (ui#51).

## What Changes

- Экран прогона слушает `GET /api/v1/events` вместо `GET /api/v1/reviews/{id}/events`, одной подпиской на экран, как раньше.
- Экран берёт только события `run.*` своего прогона (`data.id`); события чужих прогонов и незнакомых типов пропускает молча. Ошибка схемы у известного типа по-прежнему пишется в консоль как `ContractError` и подписку не рвёт.
- `run.status_changed` (и `run.created`) патчит в кэше статус, `last_progress_at`, `failed_stage`, `duration_seconds` и `updated_at`. Событие, у которого `updated_at` меньше, чем у прогона в кэше, проигрывает: правило контракта «из двух версий побеждает больший `updated_at`, при равном — пришедшая позже».
- `run.finished` патчит кэш, один раз перезапрашивает прогон (замечания, вердикт, причина сбоя) и закрывает подписку.
- Снимок: на каждое `open` потока, первое и после переподключения, экран перезапрашивает `GET /reviews/{id}`. Это заменяет снимок, который раньше слал сервер. Polling по-прежнему не нужен.
- Схема `ReviewRunListItemSchema` и типы событий `RUN_EVENT_TYPES` — в `entities/review-run`, сверены с контрактом через `MatchesContract`. Старая `RunStatusEventSchema` удалена.
- `createEventSourceStream` принимает список слушаемых типов явно, приложение передаёт `RUN_EVENT_TYPES`.
- Mock-поток — на новый путь и новые имена событий, без снимка; между переходами шлёт событие чужого прогона и событие незнакомого типа.

**Не входит:** блок шагов прогона (ui#50), подписка списка прогонов `/app/reviews` на поток.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `review-run-live-status`: источник событий — общий поток, фильтр по прогону и типу, снимок перезапросом после `open`, завершение по `run.finished`, правило `updated_at`.

## Impact

- Код: `src/entities/review-run`, `src/features/live-run-status`, `src/shared/api/eventStream.ts`, `src/pages/review-run`, `src/app/App.tsx`, `src/app/mocks`, `src/test`.
- Контракт: `pnpm api:sync` на коммит PR бэкенда dmc-268-api-t1#115; перед мёржем — `api:sync` на коммит из `develop` бэкенда.
- Порядок: capability `review-run-live-status` вводит change `review-run-live-status`, он ещё не в архиве. Этот change архивируется после него.
