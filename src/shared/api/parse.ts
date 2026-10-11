import type { z } from 'zod'

/** Ответ API не совпал с контрактом: в UI он не попадает. */
export class ContractError extends Error {
  constructor(path: string, details: string) {
    super(`Ответ ${path} не соответствует контракту: ${details}`)
    this.name = 'ContractError'
  }
}

export function parseResponse<T extends z.ZodType>(
  schema: T,
  path: string,
  data: unknown,
): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ContractError(path, result.error.message)
  }
  return result.data
}
