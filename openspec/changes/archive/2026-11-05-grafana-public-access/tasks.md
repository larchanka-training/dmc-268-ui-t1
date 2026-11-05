# Tasks

## 1. nginx

- [x] 1.1 `nginx/site.conf`: `location = /grafana` (редирект на `/grafana/`) и `location /grafana/` — `proxy_pass` через переменную без URI, `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, WebSocket, свой набор заголовков безопасности (`add_header_inherit off`)
- [x] 1.2 Вложенная `location = /grafana/login` с `limit_req` по зоне `grafana_login`
- [x] 1.3 `nginx/http.conf`, `nginx/https.conf.template`: зона `grafana_login` (считаются только POST), map `$connection_upgrade`, HSTS и Alt-Svc переменными
- [x] 1.4 `scripts/check-routes.sh`: `/grafana` перенаправляет на `/grafana/`, у `/grafana/login` свои заголовки без CSP кабинета; в CI маршруты — в своей сети docker

## 2. Инфраструктура

- [x] 2.1 `infra/network.tf`: `data "docker_network"` для `dmc268-grafana-proxy`; `infra/ui.tf`: контейнер в этой сети
- [x] 2.2 `infra/tests/main.tftest.hcl`: контейнер подключён к трём сетям стека бэкенда

## 3. Документация и проверка

- [x] 3.1 `infra/README.md`: новая сеть, location `/grafana/`, вход по личной учётной записи, порядок выката
- [x] 3.2 Проверено запуском: `nginx -t` в режимах HTTP и HTTPS; nginx с `grafana/grafana:13.2.4` под подпутём в общей сети — `/grafana/login` 200, `/grafana/api/health` ok, статика под `/grafana/public/`, вход POST, WebSocket `/grafana/api/live/ws` — 101, лимит входа — 429, без Grafana — 502 и остальной интерфейс работает
