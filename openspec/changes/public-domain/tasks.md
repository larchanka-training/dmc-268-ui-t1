# Tasks

## 1. nginx

- [x] 1.1 `nginx/select-site.sh`: `ACME_PROFILE` по виду `PUBLIC_HOST` (IP — `profile shortlived require;`, имя — без профиля), `ACME_STATE_PATH` — подкаталог тома для небоевого каталога
- [x] 1.2 `nginx/https.conf.template`: `${ACME_PROFILE}` и `${ACME_STATE_PATH}` вместо постоянных строк
- [x] 1.3 Образ: `nginx -t` для IPv4, IPv6, имени хоста и режима HTTP; выпуск сертификата против Pebble и на имя хоста без профиля, и на IP с `shortlived`

## 2. Деплой и CI

- [x] 2.1 `deploy.yml`: `HOST`, `TF_VAR_service_host` и `PUBLIC_ORIGIN` сборки — из `PUBLIC_HOST`, без неё — из `VPS_DMC268_IP_T1`; SSH — по IP; `TF_VAR_acme_directory` из `ACME_DIRECTORY`
- [x] 2.2 `TLS_INSECURE` при заданном `ACME_DIRECTORY`: `check-public.sh`, `check-routes.sh`, пробник `apply.sh`
- [x] 2.3 `ci.yml`: `PUBLIC_ORIGIN` сборки так же; `nginx -t` в режиме HTTPS на имя хоста и на IP с проверкой профиля

## 3. Документация

- [x] 3.1 `infra/README.md`: профиль по виду адреса, переменные, порядок перехода на домен, откат, старый адрес; `README.md` — ссылка

## 4. Переход на стенде (после выбора домена)

- [ ] 4.1 A-запись домена на IP стенда
- [ ] 4.2 `PUBLIC_HOST` и `ACME_DIRECTORY` (staging), деплой: сертификат staging на домен выпущен, проверки зелёные
- [ ] 4.3 `PUBLIC_ORIGIN` и адрес Grafana бэкенда на домен, деплой бэкенда
- [ ] 4.4 `ACME_DIRECTORY` удалена, деплой: боевой сертификат на домен на 90 дней, браузер открывает стенд без предупреждений
- [ ] 4.5 GitHub App: callback и webhook на домен, вход через GitHub работает
