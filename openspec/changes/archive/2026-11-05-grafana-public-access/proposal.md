# Proposal

## Why

Grafana стенда (`dmc268-grafana`, стек наблюдаемости бэкенда) открывается только через SSH-туннель: дашборды не посмотреть без доступа к серверу. Публичный вход стенда — nginx интерфейса в контейнере `dmc268-ui` с HTTPS от Let's Encrypt, и через него Grafana можно открыть по адресу стенда: на втором порту того же входа, с тем же сертификатом, но отдельным от кабинета origin — чтобы XSS в Grafana не мог прочитать API кабинета с сессией пользователя.

## What Changes

- nginx интерфейса отдаёт Grafana отдельным сервером на порту `8443` (`nginx/grafana.conf`, подключается в обоих режимах) и проксирует `/grafana/` на `dmc268-grafana:3000` в сети `dmc268-grafana-proxy`, путь — без переписывания: Grafana отдаёт себя из подпути (`GF_SERVER_SERVE_FROM_SUB_PATH`, половина бэкенда). `/grafana` перенаправляется на `/grafana/` с параметрами запроса.
- На origin кабинета `/grafana` и всё под `/grafana/` перенаправляется `301` на origin Grafana с путём и параметрами.
- Прокси передаёт `Host` с портом, адрес клиента и схему, поддерживает WebSocket Grafana Live.
- Cookie сессии кабинета `session` в запросы к Grafana не передаётся, остальные cookie, в том числе `grafana_session`, проходят.
- У ответов Grafana — свой набор заголовков безопасности на уровне server, без CSP кабинета: под ней Grafana не работает (inline-скрипты и стили). Есть nosniff, Referrer-Policy, CSP с запретом фрейма, по HTTPS — HSTS. HTTP/3 и Alt-Svc на порту Grafana нет.
- Попытки входа (`POST /grafana/login` и `POST /grafana/login/`) ограничены по частоте с адреса.
- nginx стартует и без Grafana: тогда Grafana отвечает 502, а зависшая Grafana — 504 по тайм-ауту прокси.
- Контейнер интерфейса подключается к сети `dmc268-grafana-proxy`, которую создаёт стек бэкенда; порт `8443/tcp` публикуется только в режиме TLS.
- Вход в Grafana — по личной учётной записи; cookie сессии кабинета nginx здесь не проверяет.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `frontend-delivery`: публичный вход отдаёт Grafana стенда на своём порту, отдельном origin; старые адреса `/grafana…` кабинета перенаправляются туда; у ответов Grafana свои заголовки безопасности, политика содержимого кабинета на них не распространяется (сказано в новом требовании, требование о политике кабинета не меняется).

## Impact

- `nginx/grafana.conf` (новый), `nginx/site.conf`, `nginx/http.conf`, `nginx/https.conf.template`, `Dockerfile`, `scripts/check-routes.sh` (второй аргумент — адрес Grafana), `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`.
- `infra/network.tf`, `infra/ui.tf`, `infra/tests/main.tftest.hcl`, `infra/README.md`.
- Порт `8443/tcp` публикуется в режиме TLS и должен быть открыт в файрволе стенда.
- Бэкенд (api#372) задаёт `GF_SERVER_ROOT_URL=https://<стенд>:8443/grafana/`.
- Порядок выката: сначала стек бэкенда с сетью `dmc268-grafana-proxy` и Grafana под подпутём, потом интерфейс — без сети plan интерфейса падает до изменений на сервере.

## Риски

- Риска общего с кабинетом origin нет: Grafana на своём порту. Но cookie портом не разделяются, и браузер прикладывает cookie сессии кабинета и к запросам Grafana, поэтому nginx её срезает.
- Запись cookie портом тоже не ограничена: скрипт на `:8443` (XSS в Grafana) может записать cookie на хост кабинета — раздуть заголовок Cookie до отказа кабинета (cookie-bomb) или, если своей сессии нет, подложить сессию атакующего. Закрывает только отдельное имя хоста для Grafana; до него риск принимаем.
