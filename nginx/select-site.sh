#!/bin/sh
# Выбирает режим сервера при старте контейнера: с PUBLIC_HOST — HTTPS с
# сертификатом от ACME-сервера, без него — HTTP. Запускается штатным
# entrypoint образа nginx из /docker-entrypoint.d/.
set -eu

target=/etc/nginx/conf.d/default.conf

if [ -z "${PUBLIC_HOST:-}" ]; then
    cp /etc/nginx/http.conf "$target"
    echo "$0: PUBLIC_HOST не задан, режим HTTP"
    exit 0
fi

# IPv6 не поддерживается: в адресах (redirect, server_name, Grafana на :8443)
# его пришлось бы брать в скобки. Проверка service_host в infra/variables.tf
# его не пропускает; здесь — на случай запуска образа мимо OpenTofu.
case "$PUBLIC_HOST" in
    *:*)
        echo "$0: PUBLIC_HOST=${PUBLIC_HOST} — IPv6 или адрес с портом не поддерживаются" >&2
        exit 1
        ;;
esac

acme_production=https://acme-v02.api.letsencrypt.org/directory
: "${ACME_DIRECTORY:=$acme_production}"

# Состояние модуля (ключ аккаунта, сертификаты) — на томе. У тестового
# каталога (Let's Encrypt staging, Pebble) — свой подкаталог: иначе после
# возврата на боевой каталог модуль мог бы взять с тома сертификат staging,
# которому браузер не доверяет, и отдавать его до продления. Состояние
# боевого каталога остаётся там же, где было, — перевыпуска нет.
# Боевой адрес с косой чертой в конце — тот же боевой каталог.
if [ "${ACME_DIRECTORY%/}" = "$acme_production" ]; then
    ACME_STATE_PATH=/var/lib/nginx-acme
else
    ACME_STATE_PATH=/var/lib/nginx-acme/test-directory
fi

# Профиль сертификата зависит от вида адреса. На IP Let's Encrypt выдаёт
# сертификат только с профилем shortlived (160 часов), и без него заказ
# отклоняется; require — не откатываться молча на другой профиль, а падать.
# На имя хоста профиль не запрашивается: сервер выдаёт профиль по умолчанию,
# у Let's Encrypt — classic на 90 дней. IP узнаём по виду: IPv4 — только
# цифры и точки (имя верхнего уровня из одних цифр не бывает).
case "$PUBLIC_HOST" in
    *[!0-9.]*) acme_profile= ;;
    *.*.*.*) acme_profile=shortlived ;;
    *) acme_profile= ;;
esac
if [ -n "$acme_profile" ]; then
    ACME_PROFILE="profile ${acme_profile} require;"
else
    ACME_PROFILE='# Имя хоста: профиль по умолчанию, отдельно не запрашивается.'
fi
export PUBLIC_HOST ACME_DIRECTORY ACME_PROFILE ACME_STATE_PATH

# Только свои переменные: $request_uri и прочие переменные nginx в шаблоне
# envsubst трогать не должен. Одинарные кавычки намеренны: envsubst получает
# список имён, а не их значения.
# shellcheck disable=SC2016
envsubst '${PUBLIC_HOST} ${ACME_DIRECTORY} ${ACME_PROFILE} ${ACME_STATE_PATH}' \
    < /etc/nginx/https.conf.template > "$target"
echo "$0: режим HTTPS для ${PUBLIC_HOST}, ACME: ${ACME_DIRECTORY} (состояние в ${ACME_STATE_PATH}), профиль: ${acme_profile:-по умолчанию}"
