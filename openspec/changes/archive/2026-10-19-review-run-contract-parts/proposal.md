# Proposal

## Why

Экран прогона держал вердикт с оценкой, дифф и действия воркера в mock-ресурсе вне контракта — вопреки правилу «моки отвечают по типам контракта». Решения 1, 2 и 4 из #37 приняты, дифф и шаги заведены в бэкенде заглушками `501` (api#83).

## What Changes

- Вердикт выводится из замечаний завершённого прогона: `critical`/`high` — «Нужны правки», остальные — «Есть замечания», нет — «Можно мёржить»; оценки больше нет.
- Дифф — `GET /reviews/{id}/diff` по `ReviewDiffResponse`; UI-модель строит `toDiffFile`: идентификаторы строк и свёрнутый контекст дальше трёх строк от изменения. Число замечаний на файл считает фронт.
- Ход прогона — `GET /reviews/{id}/steps` по `ReviewRunStepListResponse`: этап, статус, длительность, токены, код ошибки; без превью запросов и ответов модели. Список перезапрашивается на каждой смене этапа, текущий шаг — «выполняется».
- `501` на дифф или шаги — экран без них, замечания списком. Mock-ресурс дополнений удалён.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет в `openspec/specs/`: спека экрана прогона живёт в незаархивированном change `review-run-diff-viewer` — там обновлены «Экран прогона», «Дифф и шаги из контракта», «Ход прогона». `skip_specs: true`.

## Impact

- `src/entities/diff`, `src/entities/review-run-step` (вместо `review-run-action`), `src/entities/review-run`, `src/widgets/run-inspector`, `src/widgets/review-run-view`, `src/pages/review-run`, `src/app/mocks`.
