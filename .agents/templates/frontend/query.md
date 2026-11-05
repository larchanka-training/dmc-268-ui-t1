# Шаблон: серверные данные

Серверное состояние живёт в TanStack Query и не дублируется в Zustand. Компонент вызывает хук
слоя `entities`, а не адаптер напрямую.

```ts
// src/entities/review-run/api/reviewRunApi.ts
import type { ReviewRun } from '../model/types'

export type ReviewRunApi = {
  getRun: (id: string) => Promise<ReviewRun>
}
```

```ts
// src/entities/review-run/api/useReviewRun.ts
import { useQuery } from '@tanstack/react-query'

export function useReviewRun(id: string) {
  const api = useReviewRunApi() // HTTP-клиент; в тестах — fakeTransport
  return useQuery({
    queryKey: ['review-run', id],
    queryFn: () => api.getRun(id),
  })
}
```

Тест подменяет транспорт, а не `fetch`:

```tsx
renderWithTransport(<ReviewRunPage id="42" />, fakeTransport({ get: async () => run }))
expect(await screen.findByText('queued')).toBeInTheDocument()
```

Ключ запроса содержит всё, от чего зависит результат: иначе кэш отдаст чужие данные.
