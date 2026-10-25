# Tasks

## 1. CI

- [x] 1.1 Job `image` вместо `build` и `nginx`: hadolint (тот же SHA action, что в бэкенде), сборка с build-args деплоя, мок входа внутри образа, `nginx -t` в двух режимах, маршруты, trivy
- [x] 1.2 Поиск мока: 1 — чисто, 0 — мок в образе, иначе — ошибка самого поиска
- [x] 1.3 Локально: hadolint без замечаний, `nginx -t` в обоих режимах и `check-routes.sh` проходят, фикстуры мока в образе нет

## 2. Образ

- [x] 2.1 trivy по собранному образу нашёл brotli-libs (CVE-2026-111497, исправлена в 1.2.1-r0); `apk upgrade --no-cache` в стадии nginx — повторный скан чистый
- [x] 2.2 Сборка и сжатие статики одним `RUN` (hadolint DL3059)

## 3. Деплой

- [x] 3.1 `provenance: false` у build-push-action с причиной в комментарии
- [x] 3.2 trivy по опубликованному digest: `TRIVY_IMAGE_SRC=remote`, пороги как в CI
