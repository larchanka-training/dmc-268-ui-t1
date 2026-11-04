# Tasks

## 1. Проверки публичного входа

- [x] 1.1 Модули blackbox в `nginx/blackbox.yml`: `site`, `http_redirect`, `https_headers`, `http3`, `gzip`, `api`
- [x] 1.2 `check-public.sh`: разовый blackbox_exporter, ожидание сайта и API с засечками в `probes`, вызовы модулей, хвост лога exporter'а при сбое, уборка контейнера
- [x] 1.3 Шаг `check_public` в `deploy.yml` вместо четырёх, `STEPS` и тесты отчёта деплоя; прежние скрипты удалены

## 2. Проверка

- [x] 2.1 Каждый модуль против стенда — `probe_success 1`, HTTP/3 — `probe_http_version 3`; на заведомо плохом входе — `probe_success 0`, причина — в логе exporter'а
- [x] 2.2 `check-public.sh` против стенда: успех и строки `https`, `api` в `probes`; сломанный модуль роняет шаг с логом пробы
- [x] 2.3 shellcheck, zizmor, тесты, typecheck, lint, `openspec validate --all --strict`
