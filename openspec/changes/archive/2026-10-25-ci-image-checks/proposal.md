# Proposal

## Why

Задача ui#75. Job'ы CI `build` и `nginx` собирали бандл дважды, и оба — без `VITE_USE_MOCK_API`, то есть с mock adapter, а на стенд едет образ с HTTP-клиентом к бэкенду: CI проверял не тот бандл. Сам образ не проверялся ни hadolint, ни trivy. В деплое не было `provenance: false`: аттестация несёт данные прогона, и повторная сборка того же коммита давала новый digest — контейнер пересоздавался без изменений в образе. Опубликованный образ перед выкатом не сканировался.

## What Changes

- Один job `image` в CI: hadolint → `docker build` с теми же build-args, что у деплоя (`VITE_USE_MOCK_API` и адреса — из тех же переменных репозитория) → поиск фикстуры мока входа внутри образа → `nginx -t` в режимах HTTP и HTTPS → `scripts/check-routes.sh` → trivy (HIGH, CRITICAL, ignore-unfixed). Поиск мока различает «не нашёл» и «grep не отработал».
- Деплой: `provenance: false` у build-push-action; trivy по опубликованному `имя:тег@digest` (`TRIVY_IMAGE_SRC=remote`, креды из docker/login-action) до выката.
- Dockerfile: `apk upgrade --no-cache` в стадии nginx — пакеты ОС с исправлениями Alpine на момент сборки (trivy нашёл в `nginx:1.30-alpine` brotli-libs 1.2.0-r1 с CVE-2026-111497, исправленной в 1.2.1-r0); `pnpm run build` и сжатие статики — одним `RUN` (hadolint DL3059). Базовые образы остаются плавающими тегами, как в бэкенде: hadolint digest не требует, а уезжающий образ сканирует trivy в деплое.

## Capabilities

Поведение интерфейса и стенда не меняется, спеки не правятся (`skip_specs`): требование «Конфиг nginx проверяется до мерджа» (`frontend-delivery`) job `image` выполняет так же — `nginx -t` в обоих режимах на собранном образе.

## Impact

- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `Dockerfile`, комментарий в `scripts/check-routes.sh`.
- CI: вместо job'ов `build` и `nginx` — `image`. Обязательных проверок по имени job'а в настройках репозитория нет.
