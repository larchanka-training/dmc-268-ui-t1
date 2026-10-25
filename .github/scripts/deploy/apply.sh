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
#   `start` нового и `pull` образа — docker-провайдер заменяет образ между
#   удалением старого контейнера и созданием нового, и скачивание идёт в
#   простое. Поток, а не `docker events --since` после apply: демон держит в
#   буфере 256 последних событий, а проверки здоровья контейнеров бэкенда дают
#   три события каждая. Фильтр по событиям, а не по контейнеру: фильтры разных
#   ключей складываются через «и», и `pull` образа по имени контейнера не
#   отобрать. Чужие события (параллельный деплой бэкенда) отсеивает отчёт по id.
#   `--since` с запасом в минуту — на расхождение часов и подключение потока;
# - `docker inspect` нового сразу после apply: Created и StartedAt. Берутся
#   только Id, Created и State: остальное отчёту не нужно.
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

since="$(( $(date +%s) - 60 ))"
events="--filter type=container --filter type=image"
for event in kill die destroy create start pull; do
  events="$events --filter event=$event"
done
# shellcheck disable=SC2029 # since и фильтры раскрываются здесь намеренно
ssh stand "docker events --since $since $events --format '{{json .}}'" \
  > "$dir/ui-events.jsonl" 2>/dev/null &
watcher=$!

finish() {
  rm -f infra/tfplan
  ask ui-new.json "docker inspect -f '{\"Id\":{{json .Id}},\"Created\":{{json .Created}},\"State\":{{json .State}}}' dmc268-ui"
  kill "$watcher" 2>/dev/null || true
  wait "$watcher" 2>/dev/null || true
}
trap finish EXIT

tofu -chdir=infra apply -input=false -no-color -lock-timeout=2m tfplan
# Адрес для summary; не получен — в summary адрес из HOST, выкат не падает.
tofu -chdir=infra output -raw ui_url > "$dir/ui_url" 2>/dev/null || rm -f "$dir/ui_url"
