# Шаблон: компонент и его тест

Компонент не знает, откуда пришли данные: он получает их пропсами или через хук слоя
`entities`. Публичный вход слайса — `index.ts`.

```tsx
// src/entities/review-comment/ui/ReviewCommentThread.tsx
import type { ReviewComment } from '../model/types'

type Props = {
  comment: ReviewComment
  onReply?: (text: string) => void
}

export function ReviewCommentThread({ comment, onReply }: Props) {
  return (
    <article className="rounded border border-slate-200 p-3">
      <h3 className="text-sm font-medium">{comment.author}</h3>
      <p className="text-sm">{comment.text}</p>
      {onReply && <button type="button">Ответить</button>}
    </article>
  )
}
```

```tsx
// src/entities/review-comment/ui/ReviewCommentThread.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('показывает форму ответа после нажатия', async () => {
  const user = userEvent.setup()
  render(<ReviewCommentThread comment={comment} onReply={() => {}} />)

  await user.click(screen.getByRole('button', { name: 'Ответить' }))

  expect(screen.getByRole('textbox')).toBeInTheDocument()
})
```

Запрос по роли и тексту, не по классу. Проверка: `pnpm run test`, `pnpm run lint`.
