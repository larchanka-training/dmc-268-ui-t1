#!/bin/sh
# Проверка маршрутизации собранного образа: лендинг, приложение под /app/,
# вход, редиректы, 404, заголовки кеша и безопасности. Общая для CI (job image)
# и деплоя.
# nginx судит о входе по наличию cookie сессии, а не по её действительности,
# поэтому «вошедшего» изображает любая cookie session.
# Использование: scripts/check-routes.sh BASE_URL [GRAFANA_URL]
#   BASE_URL    — кабинет (например http://localhost:8080);
#   GRAFANA_URL — сервер Grafana на своём порту (например http://localhost:8443).
#   Без него проверяется только редирект кабинета на Grafana.
# GRAFANA_COOKIE_ECHO=1 — вместо Grafana эхо заголовка Cookie (CI): тогда
#   проверяется и то, что до Grafana доходят остальные cookie без session.
#
# Без конвейеров с `grep -q`: с `set -o pipefail` короткий grep закрывает
# канал, curl получает SIGPIPE, и проверка падает при работающем сервисе.
# Ответ кладётся в переменную, а совпадение ищется через case.
set -u

base="${1:?нужен адрес: scripts/check-routes.sh BASE_URL}"
base="${base%/}"
grafana="${2:-}"
grafana="${grafana%/}"
failed=0

fail() {
  echo "::error::$1"
  failed=1
}

# fetch ПУТЬ [COOKIE]: заполняет status, headers и body.
fetch() {
  tmp="$(mktemp)"
  status="$(curl -sS -o "$tmp" -D "$tmp.h" -w '%{http_code}' --max-time 10 -b "${2:-}" "${base}$1" 2>&1)" || status="000"
  body="$(cat "$tmp")"
  headers="$(tr -d '\r' < "$tmp.h" 2>/dev/null || true)"
  rm -f "$tmp" "$tmp.h"
}

# post_status ПУТЬ: POST с пустым телом, заполняет только status.
post_status() {
  status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 --data '' "${base}$1" 2>&1)" || status="000"
}

# has ТЕКСТ СТРОКА: есть ли строка в тексте.
has() {
  case "$1" in
    *"$2"*) return 0 ;;
    *) return 1 ;;
  esac
}

# header_has ИМЯ ЗНАЧЕНИЕ: есть ли у ответа заголовок с таким значением.
# Имена заголовков регистронезависимы, поэтому сравниваем в нижнем регистре.
header_has() {
  want="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]'):"
  while IFS= read -r line; do
    lower="$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')"
    case "$lower" in
      "$want"*) has "$line" "$2" && return 0 ;;
    esac
  done <<HEADERS
$headers
HEADERS
  return 1
}

# location_is ЗНАЧЕНИЕ: Location ответа равен значению целиком.
location_is() {
  while IFS= read -r line; do
    case "$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')" in
      location:*) [ "${line#*: }" = "$1" ] && return 0 ;;
    esac
  done <<HEADERS
$headers
HEADERS
  return 1
}

# location_ends_with ЗНАЧЕНИЕ: Location ответа оканчивается значением. Для
# редиректа на другой origin, хост которого зависит от режима.
location_ends_with() {
  while IFS= read -r line; do
    case "$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')" in
      location:*)
        case "${line#*: }" in
          *"$1") return 0 ;;
        esac
        ;;
    esac
  done <<HEADERS
$headers
HEADERS
  return 1
}

# security_headers ЧТО: у ответа есть заголовки безопасности из
# nginx/site.conf. CSP сверяем по ключевым директивам, а не строкой целиком:
# новый источник картинок или стилей не должен ломать проверку, а пропажа
# запрета чужих скриптов или фреймов — должна.
security_headers() {
  header_has X-Content-Type-Options nosniff || fail "у $1 нет X-Content-Type-Options: nosniff"
  header_has Referrer-Policy strict-origin-when-cross-origin || fail "у $1 нет Referrer-Policy: strict-origin-when-cross-origin"
  header_has Content-Security-Policy "default-src 'self'" || fail "у $1 нет CSP с default-src 'self'"
  header_has Content-Security-Policy "script-src 'self';" || fail "у $1 в CSP нет script-src 'self'"
  header_has Content-Security-Policy "frame-ancestors 'none'" || fail "у $1 в CSP нет frame-ancestors 'none'"
  header_has Content-Security-Policy "object-src 'none'" || fail "у $1 в CSP нет object-src 'none'"
}

fetch /
[ "$status" = 200 ] || fail "/ вернул ${status}, ожидался 200"
has "$body" 'name="description"' || fail "в / нет meta description: это не лендинг"
if has "$body" 'id="root"'; then fail "в / есть id=\"root\": вместо лендинга отдаётся приложение"; fi
header_has Cache-Control no-cache || fail "у / нет Cache-Control: no-cache"
has "$body" 'href="/login"' || fail "на / нет кнопки «Войти» на /login"
security_headers /

session=session=check

fetch /app/ "$session"
[ "$status" = 200 ] || fail "/app/ с cookie сессии вернул ${status}, ожидался 200"
has "$body" 'id="root"' || fail "в /app/ нет id=\"root\": это не приложение"
header_has Cache-Control no-cache || fail "у /app/ нет Cache-Control: no-cache"
security_headers "/app/ с cookie сессии"

fetch /app/reviews/123 "$session"
[ "$status" = 200 ] || fail "/app/reviews/123 с cookie сессии вернул ${status}, ожидался 200"
has "$body" 'id="root"' || fail "в /app/reviews/123 нет id=\"root\": глубокая ссылка не открывает приложение"

# Гость не получает HTML приложения: его уводят на вход с адресом возврата.
fetch /app/reviews/123
[ "$status" = 302 ] || fail "/app/reviews/123 без cookie сессии вернул ${status}, ожидался 302"
location_is '/login?redirect=/app/reviews/123' || fail "/app/reviews/123 без cookie сессии не уводит на /login?redirect=/app/reviews/123"
if has "$body" 'id="root"'; then fail "гость получил HTML приложения на /app/reviews/123"; fi
security_headers "редиректа гостя с /app/reviews/123"

# Строка запроса в redirect не попадает: её & порвал бы параметр.
fetch '/app/reviews/123?tab=files&x=1'
location_is '/login?redirect=/app/reviews/123' || fail "строка запроса попала в redirect: /app/reviews/123?tab=files&x=1"

fetch /app/
[ "$status" = 302 ] || fail "/app/ без cookie сессии вернул ${status}, ожидался 302"
location_is '/login?redirect=/app/' || fail "/app/ без cookie сессии не уводит на /login?redirect=/app/"

fetch /app/index.html
[ "$status" = 302 ] || fail "/app/index.html без cookie сессии вернул ${status}, ожидался 302: HTML приложения доступен гостю"

# Перевод строки в адресе не должен попасть в Location чужим заголовком.
fetch '/app/x%0D%0ASet-Cookie:%20injected=1'
if header_has Set-Cookie injected; then fail "перевод строки из адреса попал в заголовки ответа"; fi
location_is '/login?redirect=/app/' || fail "адрес с переводом строки не заменён на /app/ в redirect"

# % в пути nginx экранирует при подстановке в return: login.ts раскодирует
# redirect один раз и получает исходный путь.
fetch '/app/a%20b'
location_is '/login?redirect=/app/a%2520b' || fail "/app/a%20b без cookie сессии не уводит на /login?redirect=/app/a%2520b"

# Помощь открыта гостю: HTML приложения без редиректа на вход.
fetch /app/help
[ "$status" = 200 ] || fail "/app/help без cookie сессии вернул ${status}, ожидался 200"
has "$body" 'id="root"' || fail "в /app/help нет id=\"root\": это не приложение"
security_headers "/app/help без cookie сессии"

fetch /app/help/
[ "$status" = 200 ] || fail "/app/help/ без cookie сессии вернул ${status}, ожидался 200"
has "$body" 'id="root"' || fail "в /app/help/ нет id=\"root\": это не приложение"
security_headers "/app/help/ без cookie сессии"

# Статус сервиса открыт гостю так же, как помощь.
fetch /app/status
[ "$status" = 200 ] || fail "/app/status без cookie сессии вернул ${status}, ожидался 200"
has "$body" 'id="root"' || fail "в /app/status нет id=\"root\": это не приложение"
security_headers "/app/status без cookie сессии"

fetch /app/status/
[ "$status" = 200 ] || fail "/app/status/ без cookie сессии вернул ${status}, ожидался 200"
has "$body" 'id="root"' || fail "в /app/status/ нет id=\"root\": это не приложение"
security_headers "/app/status/ без cookie сессии"

# Исключение только для самих помощи и статуса: глубже и рядом гостя уводят на вход.
for path in /app/help/x /app/helpx /app/status/x /app/statusx /app/repositories; do
  fetch "$path"
  [ "$status" = 302 ] || fail "$path без cookie сессии вернул ${status}, ожидался 302 на /login"
  location_is "/login?redirect=$path" || fail "$path без cookie сессии не уводит на /login?redirect=$path"
done

fetch /login
[ "$status" = 200 ] || fail "/login вернул ${status}, ожидался 200"
if has "$body" 'id="root"'; then fail "/login отдаёт приложение вместо статичной страницы"; fi
has "$body" '/api/v1/auth/github/login' || fail "на /login нет входа через GitHub"
has "$body" 'data-error="denied"' || fail "на /login нет сообщений об ошибке входа"
security_headers /login

fetch /login.html
[ "$status" = 301 ] || fail "/login.html вернул ${status}, ожидался 301"
location_is /login || fail "/login.html не перенаправляет на /login"

fetch /login "$session"
[ "$status" = 302 ] || fail "/login с cookie сессии вернул ${status}, ожидался 302"
location_is /app/ || fail "/login с cookie сессии не уводит в /app/"

fetch /app "$session"
[ "$status" = 301 ] || fail "/app с cookie сессии вернул ${status}, ожидался 301"
location_is /app/ || fail "/app не перенаправляет на /app/"

fetch /app
[ "$status" = 302 ] || fail "/app без cookie сессии вернул ${status}, ожидался 302"
location_is '/login?redirect=/app/' || fail "/app без cookie сессии не уводит на /login?redirect=/app/"

fetch /nope
[ "$status" = 404 ] || fail "/nope вернул ${status}, ожидался 404"
if has "$body" 'id="root"'; then fail "/nope отдаёт приложение вместо страницы 404"; fi
has "$body" 'href="/app/"' || fail "в ответе /nope нет статичной страницы 404 со ссылкой на /app/"
security_headers "404 на /nope"

fetch /robots.txt
[ "$status" = 200 ] || fail "/robots.txt вернул ${status}, ожидался 200"
has "$body" 'Disallow: /app/' || fail "в /robots.txt нет Disallow: /app/"
header_has Cache-Control 'max-age=86400' || fail "у /robots.txt нет Cache-Control: max-age=86400"
security_headers /robots.txt

fetch /sitemap.xml
[ "$status" = 200 ] || fail "/sitemap.xml вернул ${status}, ожидался 200"

# Приём трейсов открыт только на POST: GET доказывает, что location есть, и
# ничего не шлёт в коллектор стенда.
fetch /otlp/v1/traces
[ "$status" = 403 ] || fail "GET /otlp/v1/traces вернул ${status}, ожидался 403: приём трейсов — только POST"

# Grafana — на своём сервере (порт 8443, nginx/grafana.conf): кабинет
# уводит туда /grafana и /grafana/... с путём и строкой запроса. Хост в
# Location зависит от режима ($host в HTTP, PUBLIC_HOST в HTTPS), поэтому
# сверяем окончание: порт, путь и запрос.
fetch '/grafana?orgId=1'
[ "$status" = 301 ] || fail "/grafana?orgId=1 вернул ${status}, ожидался 301 на сервер Grafana"
location_ends_with ':8443/grafana?orgId=1' || fail "/grafana?orgId=1 не уводит на :8443/grafana?orgId=1"

fetch '/grafana/d/x?orgId=1'
[ "$status" = 301 ] || fail "/grafana/d/x?orgId=1 вернул ${status}, ожидался 301 на сервер Grafana"
location_ends_with ':8443/grafana/d/x?orgId=1' || fail "/grafana/d/x?orgId=1 не уводит на :8443/grafana/d/x?orgId=1"

checked_grafana=""
if [ -n "$grafana" ]; then
  base="$grafana"
  checked_grafana=", сервер Grafana: /grafana, /grafana/login, лимит входа"

  fetch '/grafana?orgId=1'
  [ "$status" = 301 ] || fail "Grafana: /grafana?orgId=1 вернул ${status}, ожидался 301"
  location_is '/grafana/?orgId=1' || fail "Grafana: /grafana?orgId=1 не перенаправляет на /grafana/?orgId=1"

  # Статус не сверяем, кроме 404: он значит, что location пропала. Без
  # Grafana ответ 502, с ней — 200. Заголовки — свои:
  # CSP кабинета (script-src 'self') сломал бы Grafana, а запрет фрейма и
  # nosniff остаются.
  fetch /grafana/login
  [ "$status" = 404 ] && fail "Grafana: /grafana/login вернул 404: прокси на Grafana нет"
  header_has X-Content-Type-Options nosniff || fail "у /grafana/login нет X-Content-Type-Options: nosniff"
  header_has Referrer-Policy strict-origin-when-cross-origin || fail "у /grafana/login нет Referrer-Policy: strict-origin-when-cross-origin"
  header_has Content-Security-Policy "frame-ancestors 'none'" || fail "у /grafana/login в CSP нет frame-ancestors 'none'"
  if header_has Content-Security-Policy "script-src"; then fail "у /grafana/login CSP кабинета со script-src: Grafana под ней не работает"; fi

  # Cookie сессии кабинета до Grafana не доходит (map $cookie_without_session
  # в nginx/http.conf). Отрицательная проверка безвредна и на стенде: Grafana
  # cookie в ответ не возвращает. Положительная — только с эхом вместо
  # Grafana: без неё сломанное эхо (502) делало бы проверку пустой.
  fetch /grafana/cookie-check 'grafana_session=keep; session=leak; foo=1'
  has "$body" 'session=leak' && fail "Grafana: cookie session кабинета дошла до Grafana"
  if [ "${GRAFANA_COOKIE_ECHO:-}" = 1 ]; then
    [ "$body" = 'grafana_session=keep; foo=1' ] || fail "Grafana: до эха дошло «${body}», ожидалось «grafana_session=keep; foo=1»"
    fetch /grafana/cookie-check 'session=leak'
    [ "$body" = '' ] || fail "Grafana: при одной cookie session до эха дошло «${body}», ожидался пустой Cookie"
    fetch /grafana/cookie-check 'grafana_session=keep'
    [ "$body" = 'grafana_session=keep' ] || fail "Grafana: одна grafana_session дошла как «${body}»"
    checked_grafana="${checked_grafana}, cookie без session"
  fi

  # Лимит входа (зона grafana_login: 10 в минуту, burst 10) — последним: он
  # расходует зону для адреса, с которого идёт проверка. 429 отдаёт nginx до
  # upstream, поэтому проверка работает и без Grafana. Путь со слешем: regex
  # location покрывает и его.
  limited=0
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25; do
    post_status /grafana/login/
    if [ "$status" = 429 ]; then
      limited=1
      break
    fi
  done
  [ "$limited" = 1 ] || fail "Grafana: 25 POST на /grafana/login/ подряд без 429: лимит входа не работает"
fi

if [ "$failed" = 0 ]; then
  echo "маршруты и заголовки безопасности в порядке: /, /app/, /app/reviews/123, /app (гость и вошедший), /login (гость и вошедший), /login.html, /app/help, /app/help/, /app/status и /app/status/ (гость), /app/help/x, /app/helpx, /app/status/x, /app/statusx и /app/repositories (гость на вход), /nope, /robots.txt, /sitemap.xml, /otlp/v1/traces, /grafana и /grafana/d/x (редирект на :8443)${checked_grafana}"
fi
exit "$failed"
