import { parseResponse, type ApiTransport } from '@/shared/api'

import { ServiceStatusResponseSchema, type ServiceStatusReport } from '../model/schema'

/** Статус сервиса `GET /api/v1/status`: открыт без сессии, сервер кэширует оценку на 15 с. */
export const SERVICE_STATUS_PATH = '/status'

export async function fetchServiceStatus(transport: ApiTransport): Promise<ServiceStatusReport> {
  const path = SERVICE_STATUS_PATH
  return parseResponse(ServiceStatusResponseSchema, path, await transport.get(path))
}
