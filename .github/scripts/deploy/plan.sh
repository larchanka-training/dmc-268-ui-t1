#!/usr/bin/env bash
# План выката в файл и сторож тома ACME до apply (спека frontend-delivery,
# «Развёртывание не уничтожает том ACME»). По образцу
# dmc-268-api-t1/.github/scripts/deploy/plan.sh — держать в синхроне подход;
# отличия: init здесь же (отдельного targeted apply у интерфейса нет) и
# `-lock-timeout`.
#
# `tofu plan -out` пишет план в infra/tfplan, `tofu show -json` отдаёт его
# scripts/deploy-report.mjs: тот считает изменения по типам ресурсов для
# summary и падает, если план уничтожает или заменяет том ACME. Тогда apply не
# запускается: применяется ровно этот план (apply.sh), другого не строится.
# Первым такой план отклоняет сам OpenTofu — у тома prevent_destroy
# (infra/ui.tf); сторож — для summary и для случая, мимо которого
# prevent_destroy проходит: блок тома удалён из конфигурации целиком.
#
# Отказ prevent_destroy — это код 1 у `tofu plan`, до `show`, и JSON плана нет.
# Поэтому код и stderr `tofu plan` сохраняются: при «Resource instance cannot
# be destroyed» у `docker_volume` `deploy-report.mjs rejected` пишет в
# plan.json адреса томов, и summary называет причину. stderr — во временный
# файл вне каталога отчёта (в ошибке бывает значение переменной), в лог шага
# он печатается целиком, файл удаляется на выходе; tfplan tofu пишет и при
# ошибке — его убирает тот же trap.
#
# `-lock-timeout=2m`: блокировку состояния держит и ручной `tofu apply` из
# infra/README.md, идущий мимо concurrency деплоя, — подождать его, а не
# упасть сразу. Деплой бэкенда блокирует другой ключ и не мешает.
#
# В плане и в его JSON значения переменных лежат открытым текстом, в том числе
# registry_password (GITHUB_TOKEN). JSON идёт только трубой, на диск не
# пишется; файл плана не загружается артефактом, а удаляется: apply.sh — после
# применения, этот скрипт — если план отклонён или не построился, summary.sh —
# если job оборвался между ними.
#
# Нужны: учётные данные хранилища состояния (туннель — state-tunnel) и
# TF_VAR_* — те же, что у apply (якорь *tofu-env в deploy.yml). Параметры
# (env): REPORT_DIR — каталог отчёта, по умолчанию $RUNNER_TEMP/deploy-report.
set -euo pipefail

export REPORT_DIR="${REPORT_DIR:-${RUNNER_TEMP:-/tmp}/deploy-report}"
errors="$(mktemp "${RUNNER_TEMP:-/tmp}/plan-stderr.XXXXXX")"
drop_rejected_plan() {
  local status=$?
  rm -f "$errors"
  [ "$status" -eq 0 ] || rm -f infra/tfplan
}
trap drop_rejected_plan EXIT

tofu -chdir=infra init -input=false -no-color
status=0
tofu -chdir=infra plan -input=false -no-color -lock-timeout=2m -out=tfplan 2> "$errors" || status=$?
cat "$errors" >&2
if [ "$status" -ne 0 ]; then
  node scripts/deploy-report.mjs rejected < "$errors" || true
  exit "$status"
fi
tofu -chdir=infra show -json tfplan | node scripts/deploy-report.mjs plan
