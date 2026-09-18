# Шаблон: состояние интерфейса

Zustand — только для состояния UI, которое нужно нескольким компонентам: выбранный файл,
раскрытые блоки контекста, фильтры, панели. Серверные данные сюда не кладутся.

```ts
// src/features/diff-filters/model/store.ts
import { create } from 'zustand'

type Severity = 'info' | 'warning' | 'error'

type FiltersState = {
  severities: Severity[]
  toggle: (severity: Severity) => void
}

export const useDiffFilters = create<FiltersState>((set) => ({
  severities: [],
  toggle: (severity) =>
    set((state) => ({
      severities: state.severities.includes(severity)
        ? state.severities.filter((s) => s !== severity)
        : [...state.severities, severity],
    })),
}))
```

Тест — прямой вызов, без рендера:

```ts
useDiffFilters.getState().toggle('error')
expect(useDiffFilters.getState().severities).toEqual(['error'])
```

Значение, нужное одному компоненту, остаётся в `useState`: store заводится тогда, когда его
читает кто-то ещё.
