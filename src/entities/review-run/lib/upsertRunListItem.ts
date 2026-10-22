import type { ReviewRunListPage } from '../api/reviewRunListApi'
import { isSameOrNewer, type ReviewRunListItem } from '../model/schema'

/** Порядок списка из контракта: сначала новые по `created_at`, при равном — по `id` по убыванию. */
function comesBefore(a: ReviewRunListItem, b: ReviewRunListItem): boolean {
  const byCreated = Date.parse(b.created_at) - Date.parse(a.created_at)
  if (byCreated !== 0) return byCreated < 0
  return a.id > b.id
}

/**
 * Накладывает событие `run.*` на первую страницу списка без фильтров: upsert по `id`.
 *
 * - Строка уже на странице: заменяется, если событие не старше её (`updated_at`), иначе
 *   страница возвращается как есть.
 * - Строки нет, и по порядку списка она попадает на страницу (новый прогон — всегда сверху):
 *   вставляется, `total` растёт на один, лишняя последняя строка уходит на следующую страницу.
 * - Строки нет, и она ниже последней строки полной страницы: это прогон с других страниц,
 *   страница не меняется.
 *
 * Для отфильтрованного списка и не первой страницы не годится: поток фильтров не учитывает,
 * там страницу перезапрашивают.
 */
export function upsertRunListItem(
  page: ReviewRunListPage,
  event: ReviewRunListItem,
  pageSize: number,
): ReviewRunListPage {
  const index = page.items.findIndex((item) => item.id === event.id)
  if (index >= 0) {
    if (!isSameOrNewer(event.updated_at, page.items[index].updated_at)) return page
    const items = [...page.items]
    items[index] = event
    return { ...page, items }
  }

  const position = page.items.findIndex((item) => comesBefore(event, item))
  const at = position < 0 ? page.items.length : position
  if (at >= pageSize) return page
  const items = [...page.items.slice(0, at), event, ...page.items.slice(at)].slice(0, pageSize)
  return { items, total: page.total + 1 }
}
