import { Input } from 'antd'
import { useEffect, useState } from 'react'

import { useFilterFindings } from '../model/store'

/** Пауза после ввода, прежде чем поиск применится к замечаниям. */
export const TEXT_FILTER_DELAY = 200

function TextFilterInput() {
  const text_query = useFilterFindings((state) => state.text_query)
  const setTextQuery = useFilterFindings((state) => state.setTextQuery)
  const [draft, setDraft] = useState(text_query)

  useEffect(() => {
    if (draft === text_query) return
    const timer = setTimeout(() => setTextQuery(draft), TEXT_FILTER_DELAY)
    return () => clearTimeout(timer)
  }, [draft, text_query, setTextQuery])

  return (
    <Input
      allowClear
      size="small"
      aria-label="Поиск по тексту замечаний"
      placeholder="Текст замечания"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      className="w-48"
    />
  )
}

/**
 * Поиск по тексту замечаний. Набранное применяется с задержкой; сброс фильтров пересоздаёт поле,
 * чтобы очистить его и отменить ещё не применённый ввод.
 */
export function TextFilter() {
  const resetCount = useFilterFindings((state) => state.reset_count)
  return <TextFilterInput key={resetCount} />
}
