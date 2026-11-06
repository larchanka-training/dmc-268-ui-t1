# Tasks

## 1. nginx

- [x] 1.1 `nginx/grafana.conf`: сервер Grafana — `location = /grafana` (редирект на `/grafana/` с параметрами) и прокси через переменную без URI, `Host` с портом, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, WebSocket, заголовки безопасности на уровне server, cookie без `session`
- [x] 1.2 `location ~ ^/grafana/login/?$` с `limit_req` по зоне `grafana_login`
- [x] 1.3 `nginx/http.conf`, `nginx/https.conf.template`: сервер на порту `8443` (по HTTPS — тот же сертификат, HSTS, без HTTP/3), зона `grafana_login` (считаются только POST), map `$connection_upgrade`, `$cookie_without_session` и `$grafana_origin`
- [x] 1.4 `nginx/site.conf`: `/grafana` и `/grafana/…` кабинета — `301` на origin Grafana с путём и параметрами
- [x] 1.5 `Dockerfile`: копируется `nginx/grafana.conf`, `EXPOSE 8443`
- [x] 1.6 `scripts/check-routes.sh`: второй аргумент — адрес Grafana; редиректы со старых адресов и `/grafana` с параметрами, заголовки Grafana без CSP кабинета; в CI маршруты — в своей сети docker

## 2. Инфраструктура

- [x] 2.1 `infra/network.tf`: `data "docker_network"` для `dmc268-grafana-proxy`; `infra/ui.tf`: контейнер в этой сети, порт Grafana публикуется только в режиме TLS
- [x] 2.2 `.github/workflows/deploy.yml`: проверка маршрутов и на порту Grafana `:8443`
- [x] 2.3 `infra/tests/main.tftest.hcl`: контейнер подключён к трём сетям стека бэкенда, порт Grafana — только с TLS

## 3. Документация и проверка

- [x] 3.1 `infra/README.md`: новая сеть, сервер Grafana на `8443` и порт в файрволе стенда, вход по личной учётной записи, порядок выката
- [x] 3.2 Проверено запуском: `nginx -t` в режимах HTTP и HTTPS; nginx с `grafana/grafana:13.2.4` под подпутём на `:8443` в общей сети — `/grafana/login` 200, статика под `/grafana/public/`, вход POST, WebSocket `/grafana/api/live/ws` — 101, лимит входа на `/grafana/login/` — 429, параметры запроса сохраняются в редиректах, cookie `session` до Grafana не доходит, без Grafana — 502, на приостановленной Grafana — 504, остальной интерфейс работает
