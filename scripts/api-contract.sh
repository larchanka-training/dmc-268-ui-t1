#!/bin/sh
# Контракт API и типы из него. Источник правды — docs/openapi/openapi.json
# бэкенд-репозитория dmc-268-api-t1 на коммите из src/shared/api/contract/VERSION.
#
#   sync [<sha>] — без аргумента берёт текущую голову develop бэкенда, с
#                  аргументом — указанный коммит (например, из PR бэкенда);
#                  записывает sha в VERSION, скачивает контракт и
#                  перегенерирует типы. Перекачать по текущему VERSION:
#                  sync "$(cat src/shared/api/contract/VERSION)";
#   check        — 1) закоммиченные контракт и типы совпадают с бэкендом на
#                  зафиксированном sha; 2) этот sha входит в develop бэкенда
#                  (коммит из PR бэкенда в мёрж не пройдёт); 3) если в develop
#                  контракт новее — только предупреждение.
#
# Контракт кладётся байт в байт как в источнике: без шапки и без
# форматирования, иначе check не отличит правку руками от обновления.
#
# GITHUB_TOKEN (если задан) уходит в запросы к api.github.com: у анонимных
# запросов лимит 60 в час.
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR="$ROOT/src/shared/api/contract"
VERSION_FILE="$DIR/VERSION"
SPEC="$DIR/openapi.json"
TYPES="$DIR/schema.d.ts"
REPO=larchanka-training/dmc-268-api-t1
SPEC_PATH=docs/openapi/openapi.json
BRANCH=develop

fail() {
  echo "api-contract: $*" >&2
  exit 1
}

# Мягкое предупреждение: в GitHub Actions — аннотацией, локально — в stderr.
warn() {
  if [ "${GITHUB_ACTIONS:-}" = true ]; then
    echo "::warning::api-contract: $*"
  else
    echo "api-contract: предупреждение: $*" >&2
  fi
}

validate_sha() {
  printf '%s' "$1" | grep -Eq '^[0-9a-f]{40}$' ||
    fail "sha должен быть полным хешем коммита из 40 hex-символов, получено: '$1'"
}

read_sha() {
  [ -f "$VERSION_FILE" ] || fail "нет файла $VERSION_FILE"
  sha=$(tr -d ' \t\r\n' <"$VERSION_FILE")
  validate_sha "$sha"
  printf '%s' "$sha"
}

# Текущая голова develop бэкенда; пустая строка, если узнать не удалось.
develop_head() {
  git ls-remote "https://github.com/$REPO" "refs/heads/$BRANCH" 2>/dev/null |
    cut -f1
}

# Скачивает контракт по ref в файл $2; при ответе не 200 curl -f падает.
fetch_spec() {
  curl -fsSL --retry 3 -o "$2" "https://raw.githubusercontent.com/$REPO/$1/$SPEC_PATH"
}

download() {
  fetch_spec "$1" "$2" ||
    fail "не удалось скачать контракт: https://raw.githubusercontent.com/$REPO/$1/$SPEC_PATH"
}

generate() {
  "$ROOT/node_modules/.bin/openapi-typescript" "$1" -o "$2" >/dev/null ||
    fail "openapi-typescript не смог сгенерировать типы из $1"
}

# Входит ли sha в develop: GET compare/<sha>...develop, status ahead или
# identical. 404 (коммита нет в репозитории) — тоже «не входит».
check_in_develop() {
  url="https://api.github.com/repos/$REPO/compare/$1...$BRANCH"
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    code=$(curl -sS --retry 3 -o "$TMP/compare.json" -w '%{http_code}' \
      -H 'Accept: application/vnd.github+json' \
      -H "Authorization: Bearer $GITHUB_TOKEN" "$url") ||
      fail "не удалось запросить $url"
  else
    code=$(curl -sS --retry 3 -o "$TMP/compare.json" -w '%{http_code}' \
      -H 'Accept: application/vnd.github+json' "$url") ||
      fail "не удалось запросить $url"
  fi
  not_in_develop="контракт взят не из develop бэкенда (коммит $1): дождитесь мёржа контракта в develop и запустите pnpm api:sync"
  case "$code" in
    200) ;;
    404) fail "$not_in_develop" ;;
    *) fail "GitHub API ответил $code на $url (лимит запросов? задайте GITHUB_TOKEN)" ;;
  esac
  # jq есть не везде, node — всегда.
  status=$(node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).status ?? ""))' "$TMP/compare.json") ||
    fail "не удалось разобрать ответ $url"
  case "$status" in
    ahead | identical) ;;
    *) fail "$not_in_develop" ;;
  esac
}

# Мягкая проверка: контракт в голове develop отличается от зафиксированного.
warn_if_develop_newer() {
  if ! fetch_spec "$BRANCH" "$TMP/develop.json" 2>/dev/null; then
    warn "не удалось скачать контракт из $BRANCH бэкенда, сравнение с ним пропущено"
    return 0
  fi
  cmp -s "$TMP/develop.json" "$SPEC" ||
    warn "контракт в $BRANCH бэкенда новее зафиксированного: запустите pnpm api:sync"
}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

cmd=${1:-}
case "$cmd" in
  sync)
    if [ $# -ge 2 ]; then
      sha=$2
    else
      sha=$(develop_head)
      [ -n "$sha" ] || fail "не удалось узнать голову $BRANCH в https://github.com/$REPO"
    fi
    validate_sha "$sha"
    download "$sha" "$TMP/openapi.json"
    generate "$TMP/openapi.json" "$TMP/schema.d.ts"
    mkdir -p "$DIR"
    printf '%s\n' "$sha" >"$VERSION_FILE"
    cp "$TMP/openapi.json" "$SPEC"
    cp "$TMP/schema.d.ts" "$TYPES"
    echo "Контракт и типы обновлены до $REPO@$sha"
    ;;
  check)
    sha=$(read_sha)
    download "$sha" "$TMP/openapi.json"
    if [ ! -f "$SPEC" ] || ! cmp -s "$TMP/openapi.json" "$SPEC"; then
      fail "контракт устарел или изменён руками: ${SPEC#"$ROOT"/} не совпадает с $REPO@$sha. Запустите pnpm api:sync"
    fi
    generate "$SPEC" "$TMP/schema.d.ts"
    if [ ! -f "$TYPES" ] || ! cmp -s "$TMP/schema.d.ts" "$TYPES"; then
      fail "типы устарели или изменены руками: ${TYPES#"$ROOT"/} не совпадает с генерацией из контракта. Запустите pnpm api:sync"
    fi
    check_in_develop "$sha"
    warn_if_develop_newer
    echo "Контракт и типы совпадают с $REPO@$sha, коммит входит в $BRANCH"
    ;;
  *)
    fail "использование: $0 sync [<sha>] | check"
    ;;
esac
