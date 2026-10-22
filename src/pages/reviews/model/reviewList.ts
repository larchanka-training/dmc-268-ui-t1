import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { fetchReviewRunList, type ReviewRunListQuery } from '@/entities/review-run'
import { ApiError, useTransport } from '@/shared/api'

/** Корень ключей всех страниц списка: по нему событие потока помечает их устаревшими. */
export const REVIEW_LIST_KEY = ['reviews', 'list'] as const

/** Ключ одной страницы: все параметры запроса, иначе кэш отдал бы чужую страницу. */
export function reviewListKey(query: ReviewRunListQuery) {
  return [...REVIEW_LIST_KEY, query] as const
}

/**
 * Страница списка прогонов. При смене страницы или фильтров на экране остаётся прежняя страница,
 * пока не придёт новая (`keepPreviousData`), — таблица не мигает пустотой.
 */
export function useReviewRunList(query: ReviewRunListQuery) {
  const transport = useTransport()
  return useQuery({
    queryKey: reviewListKey(query),
    queryFn: () => fetchReviewRunList(transport, query),
    placeholderData: keepPreviousData,
  })
}

/** Ручка в контракте есть, но бэкенд пока отвечает заглушкой `501 NOT_IMPLEMENTED`. */
export function isNotImplemented(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NOT_IMPLEMENTED'
}
