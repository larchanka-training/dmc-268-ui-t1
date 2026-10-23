# Tasks

## 1. Модуль телеметрии

- [x] 1.1 Зависимости линии OpenTelemetry JS 3.0 / 0.300 через `pnpm`
- [x] 1.2 Фильтр `shared/telemetry/redact.ts`: адреса, токены, строки в кавычках, длина; тесты
- [x] 1.3 Конфиг из `VITE_OTEL_EXPORTER_URL`, `VITE_APP_VERSION`, `VITE_OTEL_ENVIRONMENT`; адрес другого origin выключает экспорт
- [x] 1.4 Чанк SDK: провайдер, resource, `BatchSpanProcessor` + OTLP/HTTP, процессор редакции `url.full`, инструментирование `fetch` только для API с `app.api.trace_id`
- [x] 1.5 `reportError`: спан `exception`, очередь до загрузки SDK, лимит 100 за загрузку страницы
- [x] 1.6 Слушатели `error` и `unhandledrejection`; `onCaughtError` / `onUncaughtError` корня React в `main.tsx`

## 2. API

- [x] 2.1 `ApiError.traceId` из `X-Trace-ID` или `trace_id` тела; тест

## 3. Тесты поведения

- [x] 3.1 Без адреса: SDK не загружается, запросов к коллектору нет, `traceparent` к API нет
- [x] 3.2 С адресом: ошибка уходит спаном `exception` с отфильтрованным сообщением; запрос к API несёт `traceparent`, у спана `url.full` без query и `app.api.trace_id`; запрос не к API — без спана
- [x] 3.3 Лимит ошибок

## 4. Сборка и документация

- [x] 4.1 `Dockerfile` и `deploy.yml`: `VITE_APP_VERSION` (sha), `VITE_OTEL_ENVIRONMENT=production` (стенд — прод, api#97), `VITE_OTEL_EXPORTER_URL` из переменной репозитория
- [x] 4.2 README: переменные телеметрии; `.agents/rules/frontend.md`: телеметрию подключает только `main.tsx`, остальные слои о ней не знают
- [ ] 4.3 В api#108 — комментарий: прокси `/otlp/` на коллектор, без `Cookie`, лимиты; CORS не нужен
