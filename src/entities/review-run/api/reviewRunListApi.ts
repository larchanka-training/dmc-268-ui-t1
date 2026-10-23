import { z } from 'zod'

import { parseResponse, type ApiTransport } from '@/shared/api'
import type { ApiOperations, ApiSchemas, MatchesContract } from '@/shared/api/contract'

import { ReviewRunListItemSchema } from '../model/schema'

/** Список прогонов `GET /api/v1/reviews`. */
export const REVIEWS_PATH = '/reviews'

/** Страница списка прогонов (`ReviewRunListResponse` контракта). */
export const ReviewRunListResponseSchema = z.object({
  items: z.array(ReviewRunListItemSchema),
  total: z.number().int(),
})

export type ReviewRunListPage = z.infer<typeof ReviewRunListResponseSchema>

/** Параметры запроса списка — ровно те, что описаны в контракте у `listReviews`. */
export type ReviewRunListQuery = NonNullable<ApiOperations['listReviews']['parameters']['query']>

/**
 * Адрес страницы списка. Массивы — повторяющимся параметром (`?status=a&status=b`), как требует
 * контракт; пустые значения в адрес не попадают — для бэкенда это «без фильтра».
 */
export function reviewRunListPath(query: ReviewRunListQuery): string {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    for (const item of Array.isArray(value) ? value : [value]) params.append(name, String(item))
  }
  const search = params.toString()
  return search ? `${REVIEWS_PATH}?${search}` : REVIEWS_PATH
}

export async function fetchReviewRunList(
  transport: ApiTransport,
  query: ReviewRunListQuery,
): Promise<ReviewRunListPage> {
  const path = reviewRunListPath(query)
  return parseResponse(ReviewRunListResponseSchema, path, await transport.get(path))
}

type WithoutItemStatus<T extends { items: { status: unknown }[] }> = Omit<T, 'items'> & {
  items: Omit<T['items'][number], 'status'>[]
}

// Статус строки шире enum контракта намеренно (`ReviewRunListItemSchema.status`), остальное — поле в поле.
const contractCheck: MatchesContract<
  WithoutItemStatus<ReviewRunListPage>,
  WithoutItemStatus<ApiSchemas['ReviewRunListResponse']>
> = true
void contractCheck
