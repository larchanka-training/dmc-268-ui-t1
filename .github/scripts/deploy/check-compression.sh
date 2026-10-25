#!/usr/bin/env bash
# Статика отдаётся сжатой: JS-бандл приложения приходит с Content-Encoding gzip
# (готовые .gz из образа, gzip_static в nginx/site.conf).
#
# Бандл берётся из HTML приложения (/app/): у лендинга JS нет, а имя файла с
# хэшем меняется от сборки к сборке. Гостя /app/ уводит на вход, поэтому
# запрос — с cookie сессии: nginx смотрит только на её наличие.
#
# Использование: check-compression.sh BASE_URL   (например https://203.0.113.7)
set -uo pipefail

base="${1:?нужен адрес: check-compression.sh BASE_URL}"
base="${base%/}"

html="$(curl -sS --max-time 5 -b session=check "${base}/app/" || true)"
asset="$(grep -oE '/assets/[^"]+\.js' <<<"$html" | head -n 1 || true)"
if [ -z "$asset" ]; then
  echo "::error::в ${base}/app/ не нашёлся JS-бандл"
  exit 1
fi

# Заголовки — в переменную, а не в конвейер с grep -q: с pipefail короткий
# grep закрывает канал, и curl падает от SIGPIPE при работающем сервисе.
headers="$(curl -sS -o /dev/null -D - -H 'Accept-Encoding: gzip' --max-time 5 "${base}${asset}" | tr -d '\r' || true)"
encoding="$(grep -i '^content-encoding:' <<<"$headers" || true)"
case "$encoding" in
  *gzip*) echo "${asset} отдаётся сжатым: ${encoding}" ;;
  *)
    echo "::error::${asset} отдаётся без gzip"
    exit 1
    ;;
esac
