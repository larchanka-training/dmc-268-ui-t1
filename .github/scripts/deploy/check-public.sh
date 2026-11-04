#!/usr/bin/env bash
# Публичный вход после выката — модулями nginx/blackbox.yml: разовый
# blackbox_exporter на раннере, по вызову /probe на модуль. Модуль не прошёл —
# лог этой пробы (`/probe?debug=true`, в нём причина) и выход с ошибкой;
# контейнер убирается в любом случае.
#
# Сайт ждём до двух минут (40 попыток раз в 3 с): на чистом томе nginx
# получает сертификат у Let's Encrypt при старте. API — до минуты: он мог
# перезапускаться параллельно, и одна попытка уронила бы деплой интерфейса.
# Время первой попытки, последней неуспешной и первого ответа — строками
# `https …` и `api …` в файл probes каталога отчёта (scripts/deploy-report.mjs).
#
# HOST — адрес стенда без схемы (env job'а); REPORT_DIR — каталог отчёта,
# по умолчанию $RUNNER_TEMP/deploy-report.
set -uo pipefail

: "${HOST:?нужна переменная HOST — адрес стенда}"
report="${REPORT_DIR:-${RUNNER_TEMP:-/tmp}/deploy-report}"
modules="$(cd "$(dirname "$0")/../../.." && pwd)/nginx/blackbox.yml"

# По digest и с quay.io: тот же образ, что в стеке наблюдаемости бэкенда, без
# анонимного лимита Docker Hub. Обновлять:
#   docker buildx imagetools inspect quay.io/prometheus/blackbox-exporter:<версия>
BLACKBOX_IMAGE='quay.io/prometheus/blackbox-exporter:v0.29.1@sha256:ea1c7aa3ef3f307cd03e85f34abb604478ccb90b567fc690da0cd9776da76b13'
exporter=http://127.0.0.1:9115

name="check-public-$$"
trap 'docker rm -f "$name" >/dev/null 2>&1' EXIT
if ! docker run -d --name "$name" -p 127.0.0.1:9115:9115 \
  -v "${modules}:/etc/blackbox_exporter/config.yml:ro" "$BLACKBOX_IMAGE" >/dev/null; then
  echo "::error::не удалось запустить blackbox_exporter"
  exit 1
fi
# Без ожидания битый конфиг выглядел бы как «сайт не отвечает две минуты».
if ! curl -fsS --retry 20 --retry-all-errors --retry-delay 1 -o /dev/null "${exporter}/-/healthy"; then
  echo "::error::blackbox_exporter не поднялся"
  docker logs "$name" 2>&1 | tail -20
  exit 1
fi

passed() {
  case "$(curl -sS -G --max-time 20 --data-urlencode "module=$1" --data-urlencode "target=$2" "${exporter}/probe")" in
    *$'\nprobe_success 1'*) return 0 ;;
    *) return 1 ;;
  esac
}

# Лог пробы с debug=true — от уровня логов exporter'а не зависит; метрики после него не нужны.
fail() {
  echo "::error::$3 (модуль $1, цель $2)"
  echo "лог повторной пробы:"
  curl -sS -G --max-time 20 --data-urlencode "module=$1" --data-urlencode "target=$2" \
    --data-urlencode debug=true "${exporter}/probe" | sed '/^Metrics that would have been returned:/,$d'
  exit 1
}

# Без GNU date (`%N` не раскрылся) — целые секунды.
now() {
  local t
  t="$(date +%s.%N)"
  echo "${t%.N}"
}

# wait_for ИМЯ МОДУЛЬ ЦЕЛЬ ПОПЫТОК: ждёт успеха пробы и пишет строку в probes.
wait_for() {
  local first="" failed=- tries=0 sent
  for _ in $(seq 1 "$4"); do
    sent="$(now)"
    first="${first:-$sent}"
    tries=$((tries + 1))
    if passed "$2" "$3"; then
      if ! { mkdir -p "$report" && echo "$1 $first $failed $(now) $tries" >> "$report/probes"; }; then
        echo "::warning::время ответа ${1} для summary не записано"
      fi
      return 0
    fi
    failed="$sent"
    sleep 3
  done
  return 1
}

# check МОДУЛЬ ЦЕЛЬ УСПЕХ ОШИБКА
check() {
  if passed "$1" "$2"; then echo "$3"; else fail "$1" "$2" "$4"; fi
}

wait_for https site "https://${HOST}/" 40 \
  || fail site "https://${HOST}/" "по https://${HOST}/ не отвечает наш сайт с действительным сертификатом"
echo "лендинг отдаётся по https://${HOST}/"
check http_redirect "http://${HOST}/" "HTTP перенаправляет на HTTPS" "HTTP не перенаправляет на https://…/"
check https_headers "https://${HOST}/" "HTTP/2, HSTS и Alt-Svc с h3 на месте" "ответ по HTTPS без HTTP/2, HSTS или Alt-Svc с h3"
check http3 "https://${HOST}/" "по QUIC отдаётся HTTP/3" "по QUIC стенд не ответил — проверьте UDP 443"
check gzip "https://${HOST}/app/" "статика отдаётся сжатой" "/app/ отдаётся без gzip"
wait_for api api "https://${HOST}/api/v1/" 20 \
  || fail api "https://${HOST}/api/v1/" "API через адрес интерфейса не ответил JSON с detail"
echo "API отвечает через адрес интерфейса"
