# Proposal

## Why

Экраны кабинета жили на рукописных моделях под моки, которые разошлись с контрактом бэкенда (сверка в #37). Переключатель `VITE_USE_MOCK_API=false` переводил на бэкенд только вход: репозитории ходили в мок-хранилище в обход `ApiTransport`, а `App` всегда собирал mock adapter. Когда бэкенд реализует ручку, экран пришлось бы переписывать.

## What Changes

- Репозитории: список — `GET /api/v1/repositories`, доступные — `GET /api/v1/repositories/available`, подключение — `POST /api/v1/repositories` с телом `{provider, providerId}`; всё через `ApiTransport`, ответы разбираются zod-схемами, совпадение с контрактом проверяет `MatchesContract`. В таблице — колонки контракта: имя, ветка по умолчанию, провайдер, автоматическое ревью, дата подключения; «Статус», «Видимость» и «Последняя синхронизация» убраны — таких данных у бэкенда нет. `501 NOT_IMPLEMENTED` на экране подключения — понятное сообщение, что подключение пока недоступно.
- Прогон: `GET /api/v1/reviews/{id}` по `ReviewRunResponse` — прогон, сводка запроса на изменение со ссылкой, отсеянные находки, замечания, опубликованные комментарии (включая `thread_reply`). Вердикт, оценка, дифф и действия воркера в контракте отсутствуют (решения 1, 2, 4 в #37) и приходят отдельным ресурсом дополнений только из мока; без них экран показывает замечания списком. `failed_stage` и `last_progress_at` — как в контракте.
- Источник данных: `App` по `VITE_USE_MOCK_API` выбирает mock adapter со сценарным потоком или HTTP-клиент с `EventSource`. Экраны ходят только через `ApiTransport` и `EventStream`; у транспорта появился `post`.
- Mock adapter отвечает по путям и формам контракта, ошибки — `ApiError` с кодом.

Спека экрана прогона живёт в незаархивированном change `review-run-diff-viewer`; её требование «Экран прогона» обновлено там же.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `cabinet-repositories`: данные по контракту через `ApiTransport`, колонки контракта, `501` на подключении.
- `cabinet-shell`: выбор источника данных по `VITE_USE_MOCK_API`.

## Impact

- `src/entities/repository`, `src/features/repository`, `src/pages/{Repositories,ConnectRepository}Page.tsx`.
- `src/entities/review-run`, `src/entities/published-comment`, `src/pages/review-run`, `src/widgets/review-run-view`.
- `src/shared/api/{transport,http}.ts`, `src/shared/config/env.ts`, `src/app/App.tsx`, `src/app/mocks/*`.
- Тесты экранов переведены на подставной `ApiTransport` вместо `vi.mock` слайса.
