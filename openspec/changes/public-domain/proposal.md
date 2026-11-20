# Proposal

## Why

Задача [ui#41](https://github.com/larchanka-training/dmc-268-ui-t1/issues/41), фронтовая половина
[api#97](https://github.com/larchanka-training/dmc-268-api-t1/issues/97): стенд переезжает с
`https://62.169.24.237` на доменное имя. На IP Let's Encrypt выдаёт сертификат только с профилем
`shortlived` (160 часов, продление раз в ~3 дня); на домен — сертификат по умолчанию на 90 дней.
Домен ещё не выбран, поэтому изменение должно мёржиться заранее и ничего не менять, пока домена
нет, а переключение — делаться только переменными репозитория.

## What Changes

- `nginx/select-site.sh` выбирает профиль сертификата по виду `PUBLIC_HOST`: IP — `profile
shortlived require;`, имя хоста — профиль не запрашивается. Шаблон получает его подстановкой
  `${ACME_PROFILE}`.
- Каталог ACME, отличный от боевого Let's Encrypt (staging, Pebble), хранит состояние в своём
  подкаталоге тома `dmc268-ui-acme`: сертификат staging не остаётся на стенде после возврата на
  боевой каталог. Состояние боевого каталога — там же, где было: сертификат на IP не
  перевыпускается. Том не трогается.
- Деплой и CI берут адрес стенда из переменной репозитория `PUBLIC_HOST`, без неё — из
  `VPS_DMC268_IP_T1`, как сейчас: `service_host`, `PUBLIC_ORIGIN` сборки, адрес проверок после
  выката. SSH по-прежнему ходит по IP.
- Переменная репозитория `ACME_DIRECTORY` доходит до `acme_directory` (OpenTofu); пока она
  задана, проверки публичного входа не сверяют цепочку сертификата — для первого выката на домен
  против Let's Encrypt staging.
- CI проверяет `nginx -t` в режиме HTTPS и для имени хоста, и для IP, и что профиль в конфиге
  соответствует виду адреса.
- Документация: порядок перехода на домен в `infra/README.md`.

**Не входит**: перенаправление с `https://<IP>/` на домен — для него нужен второй сертификат на
IP (профиль `shortlived`); `http://<IP>/` и так уводит на `https://<PUBLIC_HOST>/`. Настройка
бэкенда (`PUBLIC_ORIGIN`, адрес Grafana) и GitHub App — в `dmc-268-api-t1`.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `frontend-delivery`: сертификат стенда — по виду адреса; стенд на домене включается
  переменными без правки кода.

## Impact

- Доставка: `nginx/select-site.sh`, `nginx/https.conf.template`, `.github/workflows/deploy.yml`,
  `.github/workflows/ci.yml`, `.github/scripts/deploy/check-public.sh`,
  `.github/scripts/deploy/apply.sh`, `scripts/check-routes.sh`.
- Документация: `README.md`, `infra/README.md`.
- Переменные репозитория: новые необязательные `PUBLIC_HOST`, `ACME_DIRECTORY`.
- Код приложения и `infra/*.tf` не меняются.
