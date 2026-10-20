/** Базовый URL API v1 (OpenAPI servers: /api/v1). */
export const API_V1_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/**
 * Данные кабинета — из mock adapter (по умолчанию) или с бэкенда (`VITE_USE_MOCK_API=false`).
 * Тот же флаг выключает моки входа в dev-сервере (`vite.config.ts`).
 */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'
