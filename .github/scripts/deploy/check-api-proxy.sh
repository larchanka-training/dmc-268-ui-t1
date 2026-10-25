#!/usr/bin/env bash
# API доступен через адрес интерфейса: браузеру не нужен второй адрес
# (спека frontend-delivery). Проксирует nginx внутри контейнера интерфейса.
#
# /health наружу не публикуется — это проверка живости бэкенда, а не часть
# API. Поэтому запрос — под /api/v1/ и без -f: на путь без ручки приложение
# отвечает JSON с полем "detail", а nginx (502) и SPA-fallback (index.html)
# такого поля не дают.
#
# Ждём до минуты: если API в этот момент перезапускается (например, деплоится
# параллельно), один запрос уронил бы деплой интерфейса, который сам работает.
#
# Использование: check-api-proxy.sh BASE_URL   (например https://203.0.113.7)
set -uo pipefail

base="${1:?нужен адрес: check-api-proxy.sh BASE_URL}"
url="${base%/}/api/v1/"

body=""
for _ in $(seq 1 20); do
  body="$(curl -sS --max-time 10 "$url" 2>/dev/null || true)"
  case "$body" in *'"detail"'*) break ;; esac
  sleep 3
done

case "$body" in
  *'"detail"'*) echo "API отвечает через адрес интерфейса: ${body}" ;;
  "")
    echo "::error::API через адрес интерфейса (${url}) не ответил"
    exit 1
    ;;
  *)
    echo "::error::${url} ответил, но не API:"
    printf '%s\n' "$body" | head -5
    exit 1
    ;;
esac
