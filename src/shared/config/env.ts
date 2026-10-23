/** Базовый URL API v1 (OpenAPI servers: /api/v1). */
export const API_V1_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/**
 * Данные кабинета — из mock adapter (по умолчанию) или с бэкенда (`VITE_USE_MOCK_API=false`).
 * Тот же флаг выключает моки входа в dev-сервере (`vite.config.ts`).
 */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

/**
 * Приёмник OTLP/HTTP для трейсов кабинета — путь на том же адресе, что и интерфейс
 * (`/otlp/v1/traces`). Без него телеметрия выключена и SDK не загружается.
 */
export const OTEL_EXPORTER_URL = import.meta.env.VITE_OTEL_EXPORTER_URL || undefined

/** Окружение сборки для `deployment.environment.name`. */
export const OTEL_ENVIRONMENT = import.meta.env.VITE_OTEL_ENVIRONMENT || 'local'

/** Версия сборки — sha коммита (`service.version`). */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev'
