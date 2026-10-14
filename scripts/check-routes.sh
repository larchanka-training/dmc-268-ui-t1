#!/bin/sh
# Проверка маршрутизации собранного образа: лендинг, приложение под /app/,
# вход, редиректы, 404 и заголовки кеша. Общая для CI (job nginx) и деплоя.
# nginx судит о входе по наличию cookie сессии, а не по её действительности,
# поэтому «вошедшего» изображает любая cookie session.
# Использование: scripts/check-routes.sh BASE_URL   (например http://localhost:8080)
#
# Без конвейеров с `grep -q`: с `set -o pipefail` короткий grep закрывает
# канал, curl получает SIGPIPE, и проверка падает при работающем сервисе.
# Ответ кладётся в переменную, а совпадение ищется через case.
set -u

base="${1:?нужен адрес: scripts/check-routes.sh BASE_URL}"
base="${base%/}"
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
  want="$(printf '%s' "$1" | tr 'A-Z' 'a-z'):"
  while IFS= read -r line; do
    lower="$(printf '%s' "$line" | tr 'A-Z' 'a-z')"
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
    case "$(printf '%s' "$line" | tr 'A-Z' 'a-z')" in
      location:*) [ "${line#*: }" = "$1" ] && return 0 ;;
    esac
  done <<HEADERS
$headers
HEADERS
  return 1
}

fetch /
[ "$status" = 200 ] || fail "/ вернул ${status}, ожидался 200"
has "$body" 'name="description"' || fail "в / нет meta description: это не лендинг"
if has "$body" 'id="root"'; then fail "в / есть id=\"root\": вместо лендинга отдаётся приложение"; fi
header_has Cache-Control no-cache || fail "у / нет Cache-Control: no-cache"
has "$body" 'href="/login"' || fail "на / нет кнопки «Войти» на /login"

session=session=check

fetch /app/ "$session"
[ "$status" = 200 ] || fail "/app/ с cookie сессии вернул ${status}, ожидался 200"
has "$body" 'id="root"' || fail "в /app/ нет id=\"root\": это не приложение"
header_has Cache-Control no-cache || fail "у /app/ нет Cache-Control: no-cache"

fetch /app/reviews/123 "$session"
[ "$status" = 200 ] || fail "/app/reviews/123 с cookie сессии вернул ${status}, ожидался 200"
has "$body" 'id="root"' || fail "в /app/reviews/123 нет id=\"root\": глубокая ссылка не открывает приложение"

# Гость не получает HTML приложения: его уводят на вход с адресом возврата.
fetch /app/reviews/123
[ "$status" = 302 ] || fail "/app/reviews/123 без cookie сессии вернул ${status}, ожидался 302"
location_is '/login?redirect=/app/reviews/123' || fail "/app/reviews/123 без cookie сессии не уводит на /login?redirect=/app/reviews/123"
if has "$body" 'id="root"'; then fail "гость получил HTML приложения на /app/reviews/123"; fi

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

fetch /login
[ "$status" = 200 ] || fail "/login вернул ${status}, ожидался 200"
if has "$body" 'id="root"'; then fail "/login отдаёт приложение вместо статичной страницы"; fi
has "$body" '/api/v1/auth/github/login' || fail "на /login нет входа через GitHub"
has "$body" 'data-error="denied"' || fail "на /login нет сообщений об ошибке входа"

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

fetch /robots.txt
[ "$status" = 200 ] || fail "/robots.txt вернул ${status}, ожидался 200"
has "$body" 'Disallow: /app/' || fail "в /robots.txt нет Disallow: /app/"

fetch /sitemap.xml
[ "$status" = 200 ] || fail "/sitemap.xml вернул ${status}, ожидался 200"

if [ "$failed" = 0 ]; then
  echo "маршруты в порядке: /, /app/, /app/reviews/123, /app (гость и вошедший), /login (гость и вошедший), /nope, /robots.txt, /sitemap.xml"
fi
exit "$failed"
