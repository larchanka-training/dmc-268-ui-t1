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

: "${ACME_DIRECTORY:=https://acme-v02.api.letsencrypt.org/directory}"
export PUBLIC_HOST ACME_DIRECTORY

# Только свои переменные: $request_uri и прочие переменные nginx в шаблоне
# envsubst трогать не должен.
envsubst '${PUBLIC_HOST} ${ACME_DIRECTORY}' \
    < /etc/nginx/https.conf.template > "$target"
echo "$0: режим HTTPS для ${PUBLIC_HOST}, ACME: ${ACME_DIRECTORY}"
