# Proposal

## Why

Grafana стенда (`dmc268-grafana`, стек наблюдаемости бэкенда) открывается только через SSH-туннель: дашборды не посмотреть без доступа к серверу. Публичный вход стенда — nginx интерфейса в контейнере `dmc268-ui` с HTTPS от Let's Encrypt, и через него Grafana можно открыть по адресу стенда, не публикуя второй порт и не выпуская второй сертификат.

## What Changes

- nginx интерфейса проксирует `/grafana/` на `dmc268-grafana:3000` в сети `dmc268-grafana-proxy`, путь — без переписывания: Grafana отдаёт себя из подпути (`GF_SERVER_SERVE_FROM_SUB_PATH`, половина бэкенда). `/grafana` перенаправляется на `/grafana/`.
- Прокси передаёт `Host`, адрес клиента и схему, поддерживает WebSocket Grafana Live.
- У ответов `/grafana/` — свой набор заголовков безопасности без CSP кабинета: под ней Grafana не работает (inline-скрипты и стили). Остаются nosniff, Referrer-Policy, запрет фрейма, HSTS и Alt-Svc по HTTPS.
- Попытки входа (`POST /grafana/login`) ограничены по частоте с адреса.
- nginx стартует и без Grafana: `/grafana/` тогда отвечает 502.
- Контейнер интерфейса подключается к сети `dmc268-grafana-proxy`, которую создаёт стек бэкенда.
- Вход в Grafana — по личной учётной записи; cookie сессии кабинета nginx здесь не проверяет.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `frontend-delivery`: публичный вход проксирует Grafana стенда; у ответов `/grafana/` свои заголовки безопасности, политика содержимого кабинета на них не распространяется (сказано в новом требовании, требование о политике кабинета не меняется).

## Impact

- `nginx/site.conf`, `nginx/http.conf`, `nginx/https.conf.template`, `scripts/check-routes.sh`, `.github/workflows/ci.yml`.
- `infra/network.tf`, `infra/ui.tf`, `infra/tests/main.tftest.hcl`, `infra/README.md`.
- Порядок выката: сначала стек бэкенда с сетью `dmc268-grafana-proxy` и Grafana под подпутём, потом интерфейс — без сети plan интерфейса падает до изменений на сервере.
