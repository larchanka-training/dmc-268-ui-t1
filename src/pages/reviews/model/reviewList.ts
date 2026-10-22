import { keepPreviousData, replaceEqualDeep, useQuery } from '@tanstack/react-query'

import {
  fetchReviewRunList,
  mergeRunListSnapshot,
  type ReviewRunListPage,
  type ReviewRunListQuery,
} from '@/entities/review-run'
import { ApiError, useTransport } from '@/shared/api'

/** Корень ключей всех страниц списка: по нему событие потока помечает их устаревшими. */
export const REVIEW_LIST_KEY = ['reviews', 'list'] as const

/** Ключ одной страницы: все параметры запроса, иначе кэш отдал бы чужую страницу. */
export function reviewListKey(query: ReviewRunListQuery) {
  return [...REVIEW_LIST_KEY, query] as const
}

/**
 * Каждая запись в кэш страницы — ответ запроса и патч события — проходит через
 * `mergeRunListSnapshot`: снимок, прочитанный сервером до уже наложенного события, не откатывает
 * строку. Затем — обычное структурное разделение TanStack Query.
 */
function keepNewerRows(old: unknown, next: unknown): unknown {
  const merged = mergeRunListSnapshot(
    old as ReviewRunListPage | undefined,
    next as ReviewRunListPage,
  )
  return replaceEqualDeep(old, merged)
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
    structuralSharing: keepNewerRows,
  })
}

/** Ручка в контракте есть, но бэкенд пока отвечает заглушкой `501 NOT_IMPLEMENTED`. */
export function isNotImplemented(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NOT_IMPLEMENTED'
}
