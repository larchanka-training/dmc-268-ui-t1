#!/usr/bin/env bash
# Метрики собранного образа для summary: `dist/assets` вынимается из образа
# (в Dockerfile dist собирается и жмётся внутри), размеры — из docker.
# Использование: scripts/build-summary.sh IMAGE OUT_DIR
# Кладёт в OUT_DIR/metrics.json; разбор и вывод — scripts/build-summary.mjs.
set -euo pipefail

image="${1:?образ}"
out="${2:?каталог}"
here="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$out"
cid="$(docker create "$image")"
trap 'docker rm -f "$cid" >/dev/null' EXIT
docker cp "${cid}:/usr/share/nginx/html/assets" "${out}/assets"

size="$(docker image inspect --format '{{.Size}}' "$image")"
id="$(docker image inspect --format '{{.Id}}' "$image")"
# Сжатый размер — как слои уходят в реестр; несколько секунд на образ с nginx.
compressed="$(docker save "$image" | gzip -c | wc -c | tr -d ' ')"

node "${here}/build-summary.mjs" collect \
  --assets "${out}/assets" --out "${out}/metrics.json" \
  --image-name "$image" --image-id "$id" \
  --image-size "$size" --image-compressed "$compressed"
