# Proposal

## Why

Ошибку кабинета команда сейчас видит, только если пользователь пришлёт скриншот: необработанные исключения и падения рендера остаются в консоли браузера. Запрос к API, упавший у пользователя, со стороны API найти можно по `X-Trace-ID`, но что делал браузер до него и сколько ждал ответа — нет. Бэкенд уже пишет трейсы OpenTelemetry и ставит span link на `traceparent` клиента (api#84, api#110); коллектор и Grafana поднимаются в api#89 и на проде в api#108. Фронтовая часть — #49.

## What Changes

- Кабинет отправляет в коллектор OpenTelemetry по OTLP/HTTP необработанные ошибки (`error`, `unhandledrejection`, ошибки рендера React) и спаны запросов к API.
- Запрос к API несёт `traceparent`; запросы к другим адресам — нет и не трассируются. `X-Trace-ID` ответа API пишется атрибутом на спан запроса и на ошибку `ApiError`.
- Сообщение и стектрейс ошибки и адрес запроса проходят фильтр: строка запроса, фрагмент, токены, длинные строки в кавычках (код, тексты) вырезаются, длина ограничена.
- Экспорт включается только адресом коллектора `VITE_OTEL_EXPORTER_URL`, путём на том же адресе, что и интерфейс. Без него SDK не загружается и запросов к коллектору нет. Адрес другого origin не принимается: экспорт выключен.
- Resource: `service.name=dmc-268-ui`, `service.version` — sha коммита сборки, `deployment.environment.name`.
- Число отправляемых ошибок за загрузку страницы ограничено.

## Capabilities

### New Capabilities

- `cabinet-telemetry`: что кабинет собирает в OpenTelemetry, что не отправляется никогда, когда экспорт включён.

## Impact

- Код: новый модуль `src/shared/telemetry/`, подключение в `src/main.tsx`; `ApiError` получает `traceId`; `src/shared/config/env.ts`, `src/vite-env.d.ts`.
- Зависимости: `@opentelemetry/api`, `sdk-trace`, `core`, `resources`, `semantic-conventions`, `instrumentation`, `instrumentation-fetch`, `exporter-trace-otlp-http`. SDK — отдельный чанк, загружается только при включённом экспорте.
- Сборка и деплой: `Dockerfile` и `.github/workflows/deploy.yml` передают `VITE_APP_VERSION`, `VITE_OTEL_ENVIRONMENT` и `VITE_OTEL_EXPORTER_URL` (переменная репозитория, по умолчанию пусто — экспорт выключен).
- CSP не меняется: коллектор на том же адресе, `connect-src 'self'` его пропускает. Прокси `/otlp/` в nginx на коллектор, удаление `Cookie` и лимиты размера и частоты — в api#108 вместе с самим коллектором; CORS в коллекторе для кабинета не нужен.
