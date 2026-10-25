#!/usr/bin/env bash
# Summary деплоя интерфейса: исход, простой публичного входа, план, диск и
# шаги — из того, что сложили в каталог отчёта шаги job'а
# (scripts/deploy-report.mjs). По образцу
# dmc-268-api-t1/.github/scripts/deploy/summary.sh — держать в синхроне.
#
# Шаг идёт всегда (`if: always()`), в том числе после упавшего, и сам не падает:
# не собралось значение — в summary нет строки, а не красный прогон. Поэтому
# `-e` нет.
#
# Сервер общий с бэкендом, и свободное место — общее: раздел Docker — каталог
# из `docker info`; на корневой файловой системе он сольётся с `/`.
#
# Нужен хост `stand` в ~/.ssh/config (.github/actions/stand-ssh). Параметры
# (env): REPORT_DIR — каталог отчёта (по умолчанию $RUNNER_TEMP/deploy-report),
# GITHUB_STEP_SUMMARY и для render — STEP_RESULTS, JOB_STATUS, IMAGE, SHA, HOST.
set -uo pipefail

export REPORT_DIR="${REPORT_DIR:-${RUNNER_TEMP:-/tmp}/deploy-report}"
mkdir -p "$REPORT_DIR"

# Файл плана с токеном реестра удаляют plan.sh и apply.sh; job, отменённый
# между ними, оставил бы его — убрать на любом исходе.
rm -f infra/tfplan

# timeout 30: ConnectTimeout через живой ControlMaster не действует, и
# пропавший без разрыва master держал бы шаг до его timeout-minutes.
# shellcheck disable=SC2016 # переменные раскрывает shell сервера
timeout 30 ssh -o ConnectTimeout=10 stand \
  'root="$(docker info -f "{{.DockerRootDir}}")"; echo "docker_root $root"; df -Pk / "$root"' \
  > "$REPORT_DIR/disk.txt" 2>/dev/null || true

if ! node scripts/deploy-report.mjs render >> "${GITHUB_STEP_SUMMARY:?}"; then
  echo "::warning::summary деплоя не собрался"
fi
exit 0
