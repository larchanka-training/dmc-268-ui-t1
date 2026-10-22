import type { components, operations } from './schema'

/** Схемы ответов из контракта бэкенда (`schema.d.ts` генерирует `pnpm api:sync`). */
export type ApiSchemas = components['schemas']

/**
 * Операции контракта по `operationId`: параметры запроса и ответы ручки. Например, параметры
 * списка прогонов — `ApiOperations['listReviews']['parameters']['query']`.
 */
export type ApiOperations = operations

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

/**
 * Компилируется, только если тип ответа из zod-схемы совпадает с типом из контракта
 * поле в поле, включая nullable и enum. Zod остаётся проверкой во время работы, а это —
 * проверка при сборке: контракт поменялся — `typecheck` падает.
 *
 *   export type _Check = MatchesContract<z.infer<typeof schema>, ApiSchemas['UserResponse']>
 */
export type MatchesContract<Actual, Contract> =
  Equals<Actual, Contract> extends true ? true : { расходится_с_контрактом: [Actual, Contract] }
