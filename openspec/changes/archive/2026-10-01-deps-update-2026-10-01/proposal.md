# Proposal

## Why

Все devDependencies отстают на патч или минорную версию: vite, vitest, eslint, prettier, typescript-eslint, jsdom, lint-staged и другие. Обновлять их пачкой раз в какое-то время дешевле, чем разбираться с накопленным отставанием разом.

## What Changes

- `pnpm update` в пределах диапазонов `package.json`: нижние границы подняты до установленных версий, `pnpm-lock.yaml` пересобран.

**Не входит:** TypeScript 6 → 7 — мажорная версия с новым компилятором, отдельное изменение.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет.

`skip_specs: true`: обновляются версии зависимостей разработки, поведение интерфейса не меняется.

## Impact

- `package.json`, `pnpm-lock.yaml`. Все обновлённые пакеты — devDependencies, в сборку интерфейса попадает только результат их работы.
