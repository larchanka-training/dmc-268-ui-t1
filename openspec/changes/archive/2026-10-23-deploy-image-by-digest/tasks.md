# Tasks

## 1. Деплой-workflow

- [x] 1.1 Тег `<commit sha>-<mock|api>`, флаг `VITE_USE_MOCK_API` вычисляется один раз и уходит в build-args через output
- [x] 1.2 Шаг «Ссылка на образ по digest»: `ghcr.io/<repo>@<digest>` из `docker/build-push-action`
- [x] 1.3 `TF_VAR_ui_image` — ссылка по digest; digest в summary деплоя; пустой digest — ошибка шага

## 2. Инфраструктура и документация

- [x] 2.1 `infra/variables.tf`, `infra/README.md`: `ui_image` в CI — по digest, локально можно по тегу
