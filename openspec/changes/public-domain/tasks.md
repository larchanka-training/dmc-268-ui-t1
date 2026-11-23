# Tasks

## 1. nginx

- [x] 1.1 `nginx/select-site.sh`: `ACME_PROFILE` по виду `PUBLIC_HOST` (IP — `profile shortlived require;`, имя — без профиля), `ACME_STATE_PATH` — подкаталог тома для небоевого каталога
- [x] 1.2 `nginx/https.conf.template`: `${ACME_PROFILE}` и `${ACME_STATE_PATH}` вместо постоянных строк
- [x] 1.3 Образ: `nginx -t` для IPv4, имени хоста и режима HTTP, IPv6 в `PUBLIC_HOST` — отказ скрипта; выпуск сертификата против Pebble и на имя хоста без профиля, и на IP с `shortlived`

## 2. Деплой и CI

- [x] 2.1 `deploy.yml`: `HOST`, `TF_VAR_service_host` и `PUBLIC_ORIGIN` сборки — из `PUBLIC_HOST`, без неё — из `VPS_DMC268_IP_T1`; SSH — по IP; `TF_VAR_acme_directory` из `ACME_DIRECTORY`
- [x] 2.2 `TLS_INSECURE` при заданном `ACME_DIRECTORY`: `check-public.sh`, `check-routes.sh`, пробник `apply.sh`
- [x] 2.3 `ci.yml`: `PUBLIC_ORIGIN` сборки так же; `nginx -t` в режиме HTTPS на имя хоста и на IP с проверкой профиля

## 3. Проверки (ревью)

- [x] 3.1 `infra/variables.tf`: `service_host` — имя хоста в нижнем регистре или IPv4; `acme_directory` не принимает боевой адрес; `tofu test` — допустимые и отвергнутые значения
- [x] 3.2 `select-site.sh`: двоеточие в `PUBLIC_HOST` — отказ; боевой адрес с косой чертой — боевое состояние
- [x] 3.3 `deploy.yml`: с `ACME_DIRECTORY` — только ручной запуск, предупреждение в summary; боевой адрес в переменной — отказ; job `deploy` берёт каталог выходом `gate`
- [x] 3.4 `check-public.sh`: `POST /api/v1/auth/logout` с `Origin: https://<HOST>` не получает `403 ORIGIN_FORBIDDEN`; временная копия модулей blackbox удаляется на выходе
- [x] 3.5 `ci.yml`: `nginx -t` с каталогом staging и проверкой `state_path`
- [x] 3.6 `select-site.sh`: состояние тестового каталога — `/var/lib/nginx-acme-test` вне тома (без `CAP_DAC_OVERRIDE` подкаталог в корне тома не создаётся)
- [x] 3.7 `ci.yml`: `nginx -t` в режиме HTTPS с capabilities стенда и корнем тома, отданным `nginx`
- [x] 3.8 `infra/README.md`: callback домена вторым до staging, окно без вебхуков, Webhook и Setup URL сразу за боевым сертификатом, повтор доставок; то же при откате

## 4. Документация

- [x] 4.1 `infra/README.md`: профиль по виду адреса, переменные, правило равенства `PUBLIC_ORIGIN`, IPv6 не поддерживается, порядок перехода на домен с тишиной `PublicEndpointDown`, Setup URL GitHub App, откат, старый адрес; `README.md` — ссылка

## 5. Переход на стенде (после выбора домена)

- [ ] 5.1 A-запись домена на IP стенда
- [ ] 5.2 Callback URL домена добавлен в GitHub App вторым
- [ ] 5.3 `PUBLIC_HOST` и `ACME_DIRECTORY` (staging), деплой: сертификат staging на домен выпущен, проверки зелёные
- [ ] 5.4 `PUBLIC_ORIGIN` и адрес Grafana бэкенда на домен, деплой бэкенда
- [ ] 5.5 `ACME_DIRECTORY` удалена, деплой: боевой сертификат на домен на 90 дней, браузер открывает стенд без предупреждений
- [ ] 5.6 GitHub App сразу за 5.5: Setup URL и webhook на домен, упавшие доставки повторены, вход через GitHub работает
