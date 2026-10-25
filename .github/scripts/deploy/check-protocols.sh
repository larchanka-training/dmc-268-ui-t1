#!/usr/bin/env bash
# Стенд отдаётся по HTTP/2 и HTTP/3: по TCP — HTTP/2, в ответе — Alt-Svc с h3,
# по QUIC (UDP 443) — HTTP/3.
#
# HTTP/2 снимает лимит браузера в 6 соединений на адрес — без него несколько
# открытых SSE-подписок занимают все соединения. Alt-Svc нужен именно на
# index.html: из него браузер узнаёт о QUIC.
#
# Адрес — переменная HOST (IP или имя стенда, без схемы), её задаёт env job'а.
# Для HTTP/3 нужен docker: curl раннера собран без HTTP/3.
set -uo pipefail

: "${HOST:?нужна переменная HOST — адрес стенда}"
url="https://${HOST}/"

# curl с HTTP/3 из Debian. Образ — по digest: проверка не меняется от того,
# что тег trixie-slim переехал на новую сборку. Обновлять вместе с Debian:
#   docker buildx imagetools inspect debian:trixie-slim
DEBIAN_IMAGE='debian:trixie-slim@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad'

version="$(curl -sS -o /dev/null -w '%{http_version}' --http2 --max-time 5 "$url" || true)"
case "$version" in
  2) echo "по TCP отдаётся HTTP/2" ;;
  0 | "")
    echo "::error::${url} не ответил по HTTPS"
    exit 1
    ;;
  *)
    echo "::error::по TCP отдаётся HTTP/${version}, ожидался HTTP/2"
    exit 1
    ;;
esac

# Заголовки — в переменную, а не в конвейер с grep -q: с pipefail короткий
# grep закрывает канал, и curl падает от SIGPIPE при работающем сервисе.
headers="$(curl -sS -o /dev/null -D - --max-time 5 "$url" | tr -d '\r' || true)"
alt_svc="$(grep -i '^alt-svc:' <<<"$headers" || true)"
case "$alt_svc" in
  *'h3=":443"'*) echo "интерфейс объявляет HTTP/3: ${alt_svc}" ;;
  *)
    echo "::error::в ответе нет Alt-Svc с h3"
    exit 1
    ;;
esac

# Запрос только по QUIC заодно проверяет, что UDP 443 открыт до стенда. Адрес
# уходит в контейнер переменной окружения, а не подстановкой в текст команды.
# Вывод apt глушится: при сбое печатается маркер no-curl, и сбой установки
# не выдаётся за проблему сети стенда.
# shellcheck disable=SC2016  # $URL раскрывает sh внутри контейнера
h3_version="$(docker run --rm -e URL="$url" -e DEBIAN_FRONTEND=noninteractive "$DEBIAN_IMAGE" sh -c '
  { apt-get -qq update && apt-get -qq install -y --no-install-recommends curl ca-certificates; } >/dev/null 2>&1 \
    || { echo no-curl; exit 0; }
  curl -sS -o /dev/null -w "%{http_version}" --http3-only --max-time 10 "$URL"
' || true)"
case "$h3_version" in
  3) echo "по QUIC отдаётся HTTP/3" ;;
  no-curl)
    echo "::error::не удалось поставить curl в ${DEBIAN_IMAGE} — проверка HTTP/3 не выполнена"
    exit 1
    ;;
  *)
    echo "::error::по QUIC стенд не ответил — проверьте UDP 443"
    exit 1
    ;;
esac
