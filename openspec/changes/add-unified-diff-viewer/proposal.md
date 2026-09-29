## Why

Issue #5 требует не только архитектурный документ, но и базовые UI-компоненты
для просмотра кода и diff. Сейчас приложение содержит только стартовый экран,
поэтому архитектурные решения нельзя проверить на работающем mock-интерфейсе.

## What Changes

- Добавить технический экран одного mock-прогона ревью.
- Реализовать список файлов и просмотр одного выбранного файла в unified-режиме.
- Реализовать hunk, строки diff и показ `ReviewFinding` у корректной изменённой
  строки.
- Добавить `RunInspector` с mock-хронологией действий прогона.
- Добавить mock adapter, Zod-валидацию его данных и разделить server/UI-state
  между TanStack Query, Zustand и локальным React state.
- Добавить доступные пользовательские действия и тесты видимого поведения.

## Capabilities

### New Capabilities

- `unified-diff-viewer`: технический просмотр одного mock-прогона ревью со
  списком файлов, unified diff и inline findings.

### Modified Capabilities

Нет.

## Impact

- Затрагивает `src/app`, `src/pages`, `src/widgets`, `src/entities` и `src/shared`.
- Использует уже добавленные зависимости TanStack Query, Zustand, Headless UI и Zod.
- Не добавляет HTTP API, авторизацию, polling, deployment, side-by-side diff или
  browser-контракт с backend.
