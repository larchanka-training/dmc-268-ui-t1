#!/usr/bin/env bash
# По адресу стенда отдаётся именно наш сайт, и только по HTTPS: сертификат
# действителен, HTTP перенаправляет на HTTPS, ответ несёт HSTS.
#
# curl проверяет сертификат, поэтому первый же запрос заодно убеждается, что
# он выпущен. На чистом томе nginx получает его у Let's Encrypt при старте —
# отсюда ожидание до двух минут: 40 попыток раз в 3 с.
#
# Время первой попытки, последней неуспешной и первого ответа — строкой
# `https …` в файл probes каталога отчёта: по нему summary считает, когда
# публичный вход снова ответил (scripts/deploy-report.mjs). Проверки здоровья у
# контейнера нет, и это единственная отметка готовности. Не записалось —
# предупреждение, проверка не падает.
#
# Адрес — переменная HOST (IP или имя стенда, без схемы), её задаёт env job'а.
# REPORT_DIR — каталог отчёта, по умолчанию $RUNNER_TEMP/deploy-report.
set -uo pipefail

: "${HOST:?нужна переменная HOST — адрес стенда}"
url="https://${HOST}/"
report="${REPORT_DIR:-${RUNNER_TEMP:-/tmp}/deploy-report}"

# Без GNU date (`%N` не раскрылся) — целые секунды.
now() {
  local t
  t="$(date +%s.%N)"
  echo "${t%.N}"
}

body="" first="" failed=- tries=0
for _ in $(seq 1 40); do
  sent="$(now)"
  first="${first:-$sent}"
  tries=$((tries + 1))
  body="$(curl -fsS --max-time 5 "$url" 2>/dev/null || true)"
  if [ -n "$body" ]; then
    answered="$(now)"
    break
  fi
  failed="$sent"
  sleep 3
done

if [ -z "$body" ]; then
  echo "::error::по ${url} ничего не отвечает или сертификат недействителен"
  curl -sSv --max-time 5 "$url" 2>&1 | tail -15 || true
  exit 1
fi

# Различаем «не отвечает» и «отвечает не тем»: на адресе мог бы оказаться
# другой сервис или страница-заглушка nginx. В корне лендинг, «DMC-268» есть
# в его <title>.
case "$body" in
  *"DMC-268"*)
    echo "лендинг отдаётся по ${url}"
    if ! { mkdir -p "$report" && echo "https $first $failed $answered $tries" >> "$report/probes"; }; then
      echo "::warning::время ответа HTTPS для summary не записано"
    fi
    ;;
  *)
    echo "::error::${url} отвечает, но это не наш сайт"
    printf '%s\n' "$body" | head -5
    exit 1
    ;;
esac

# HTTP не должен отдавать интерфейс открытым текстом — только перенаправлять.
location="$(curl -sS -o /dev/null -w '%{redirect_url}' --max-time 5 "http://${HOST}/" || true)"
if [ "$location" != "$url" ]; then
  echo "::error::HTTP не перенаправляет на HTTPS: '${location}'"
  exit 1
fi
echo "HTTP перенаправляет на HTTPS"

# HSTS: после первого ответа по HTTPS браузер больше не ходит по HTTP.
# Заголовки — в переменную, а не в конвейер с grep -q: с pipefail короткий
# grep закрывает канал, curl получает SIGPIPE, и проверка падает при
# работающем сервисе.
headers="$(curl -sS -o /dev/null -D - --max-time 5 "$url" | tr -d '\r' || true)"
hsts="$(grep -i '^strict-transport-security:' <<<"$headers" || true)"
case "$hsts" in
  *max-age=*) echo "HTTPS закреплён заголовком: ${hsts}" ;;
  *)
    echo "::error::в ответе по HTTPS нет Strict-Transport-Security"
    exit 1
    ;;
esac
