#!/usr/bin/env bash
# Выкат: `tofu apply` плана, который построил и проверил plan.sh, и сырьё для
# разбивки простоя публичного входа в summary (scripts/deploy-report.mjs). По
# образцу dmc-268-api-t1/.github/scripts/deploy/apply.sh — держать в синхроне
# подход; здесь контейнер `dmc268-ui`, а готовность — снаружи (check-site.sh).
#
# Простой считается по часам сервера:
# - часы сервера и раннера вокруг одного `date` на сервере — чтобы перевести
#   на часы сервера время ответа HTTPS, которое засекает раннер;
# - id контейнера до apply — чтобы отличить старый от нового и понять,
#   пересоздавался ли он вообще;
# - события Docker все время apply: `kill` и `die` старого, `create` и
#   `start` нового и `pull` образа. До #89 / #91 docker-провайдер заменял образ
#   между удалением старого контейнера и созданием нового, и скачивание шло в
#   простое; после #91 образ скачивается до apply, и `pull` в потоке приходится
#   на время до остановки — в простой отчёт его не считает. Поток, а не
#   `docker events --since` после apply: демон держит в
#   буфере 256 последних событий, а проверки здоровья контейнеров бэкенда дают
#   три события каждая. Фильтр по событиям, а не по контейнеру: фильтры разных
#   ключей складываются через «и», и `pull` образа по имени контейнера не
#   отобрать. Чужие события (параллельный деплой бэкенда) отсеивает отчёт по id.
#   `--since` — по часам сервера из `clock` (не ответил — по часам раннера) с
#   запасом в минуту на подключение потока;
# - `docker inspect` нового сразу после apply: Created и StartedAt. Берутся
#   только Id, Created и State: остальное отчёту не нужно;
# - пробник публичного входа (`ui-probe`): с запуска до конца шага раз в 0,25 с
#   запрос по тому же адресу, что у check-site.sh, — `https://$HOST/`, ответ не
#   дольше 1 с; строка `<время отправки по часам раннера> <код HTTP>`, код 000 —
#   ответа нет. Простой — от первого отказа до первого 2xx после StartedAt: без
#   хвоста apply и переключения шагов, которые попадали в первый ответ
#   check-site.sh. Деплой идёт только с TLS; без PUBLIC_HOST (public_tls =
#   false) nginx не слушает 443, пробник видит одни отказы, и отчёт берёт
#   границу по check-site.sh. Пробник останавливает finish: дожидается 2xx на
#   запрос, отправленный после apply, но не дольше 5 с, и снимает его — curl
#   доработает, шаг пробник не переживает. Без HOST пробника нет.
#
# Вопросы серверу — под `timeout 30`: `ConnectTimeout` через живой
# ControlMaster не действует, и пропавший без разрыва master держал бы шаг до
# таймаута job'а. Не удалось спросить (ssh 255, timeout 124) — рядом с ответом
# файл `<имя>.error` с кодом: summary отличает «контейнера нет» от «сервер не
# ответил».
#
# Сбор сырья выкат не роняет: код возврата — код `tofu apply`. Файл плана
# удаляется на выходе в любом случае.
#
# Нужны: хост `stand` в ~/.ssh/config (.github/actions/stand-ssh), infra/tfplan
# от plan.sh и учётные данные хранилища состояния. Параметры (env):
# REPORT_DIR — каталог отчёта, по умолчанию $RUNNER_TEMP/deploy-report.
set -euo pipefail

dir="${REPORT_DIR:-${RUNNER_TEMP:-/tmp}/deploy-report}"
mkdir -p "$dir"

# Ответ сервера на команду — в файл отчёта; код ssh или timeout — в <файл>.error.
ask() {
  local file="$1" status=0
  shift
  timeout 30 ssh stand "$@" > "$dir/$file" 2>/dev/null || status=$?
  if [ "$status" -eq 124 ] || [ "$status" -eq 255 ]; then
    echo "$status" > "$dir/$file.error"
  fi
}

# Без GNU date (`%N` не раскрылся) — целые секунды.
now() {
  local t
  t="$(date +%s.%N)"
  echo "${t%.N}"
}

before="$(now)"
ask clock "date +%s.%N"
echo "$before $(now)" > "$dir/runner-clock"

ask ui-old-id "docker inspect -f '{{.Id}}' dmc268-ui 2>/dev/null"

# Часы сервера уже спрошены: `docker events --since` считает по ним, и
# отстающий сервер не потеряет `kill` и `die` старого. Не ответил — часы раннера.
server_now="$(cat "$dir/clock" 2>/dev/null || true)"
server_now="${server_now%%.*}"
case "$server_now" in
  '' | *[!0-9]*) server_now="$(date +%s)" ;;
esac
since="$((server_now - 60))"
events="--filter type=container --filter type=image"
for event in kill die destroy create start pull; do
  events="$events --filter event=$event"
done
# shellcheck disable=SC2029 # since и фильтры раскрываются здесь намеренно
ssh stand "docker events --since $since $events --format '{{json .}}'" \
  > "$dir/ui-events.jsonl" 2>/dev/null &
watcher=$!

# Пробник: curl на переднем плане, поэтому TERM ждёт конца запроса (до 1 с) —
# строка дописывается целиком, и сирот не остаётся.
probe() {
  local sent code
  trap 'exit 0' TERM
  while :; do
    sent="$(now)"
    code="$(curl -s -o /dev/null --max-time 1 -w '%{http_code}' "$url" 2>/dev/null)" || true
    echo "$sent ${code:-000}" >> "$dir/ui-probe"
    sleep 0.25
  done
}

# Ответ нового контейнера: 2xx на запрос, отправленный после apply. Ждать его
# не дольше 5 с — упавший apply не держит шаг.
stop_probe() {
  [ -n "$prober" ] || return 0
  local applied _
  applied="$(now)"
  for _ in $(seq 1 20); do
    if tail -n 1 "$dir/ui-probe" 2>/dev/null |
      awk -v t="$applied" '$1 >= t && $2 ~ /^2/ { ok = 1 } END { exit !ok }'; then
      break
    fi
    sleep 0.25
  done
  kill "$prober" 2>/dev/null || true
  wait "$prober" 2>/dev/null || true
}

prober=""
finish() {
  rm -f infra/tfplan
  stop_probe
  ask ui-new.json "docker inspect -f '{\"Id\":{{json .Id}},\"Created\":{{json .Created}},\"State\":{{json .State}}}' dmc268-ui"
  kill "$watcher" 2>/dev/null || true
  wait "$watcher" 2>/dev/null || true
}
trap finish EXIT

if [ -n "${HOST:-}" ]; then
  url="https://${HOST}/"
  probe &
  prober=$!
fi

tofu -chdir=infra apply -input=false -no-color -lock-timeout=2m tfplan
# Адрес для summary; не получен — в summary адрес из HOST, выкат не падает.
tofu -chdir=infra output -raw ui_url > "$dir/ui_url" 2>/dev/null || rm -f "$dir/ui_url"
