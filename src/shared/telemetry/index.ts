import { SpanStatusCode, type Attributes, type Tracer } from '@opentelemetry/api'
import type { RootOptions } from 'react-dom/client'

import { ApiError } from '@/shared/api'
import {
  API_V1_BASE_URL,
  APP_VERSION,
  OTEL_ENVIRONMENT,
  OTEL_EXPORTER_URL,
} from '@/shared/config/env'

import {
  API_TRACE_ID_ATTRIBUTE,
  COMPONENT_STACK_ATTRIBUTE,
  ERROR_SOURCE_ATTRIBUTE,
} from './attributes'
import { redactMessage, redactStack, redactUrl } from './redact'
import type { Sdk, SdkConfig } from './sdk'

/** Больше ошибок за загрузку страницы не отправляется: ошибка в цикле не зальёт коллектор. */
export const ERROR_REPORT_LIMIT = 100

export type ErrorSource = 'window.error' | 'unhandledrejection' | 'react'

export type Telemetry = {
  /** Экспорт включён: адрес коллектора задан и он на том же адресе, что и интерфейс. */
  enabled: boolean
  reportError: (error: unknown, source: ErrorSource, componentStack?: string) => void
  /** Для `createRoot`: ошибки рендера, в том числе перехваченные `ErrorBoundary` и восстановимые. */
  rootOptions: Pick<RootOptions, 'onCaughtError' | 'onUncaughtError' | 'onRecoverableError'>
  /** SDK загружен и очередь ошибок отправлена в него (или экспорт выключен). */
  ready: Promise<void>
  flush: () => Promise<void>
  shutdown: () => Promise<void>
}

export type TelemetryOptions = {
  /** `VITE_OTEL_EXPORTER_URL`: путь на том же адресе, например `/otlp/v1/traces`. */
  exporterUrl?: string
  apiBaseUrl?: string
  serviceVersion?: string
  environment?: string
  origin?: string
  /** Загрузка чанка SDK; тест подставляет SDK с экспортёром в память. */
  loadSdk?: () => Promise<{ startSdk: (config: SdkConfig) => Sdk }>
}

type PendingError = {
  error: unknown
  source: ErrorSource
  componentStack: string | undefined
  time: number
  path: string
}

/**
 * Адрес коллектора — только на том же origin: CSP `connect-src 'self'` другой не
 * пропустит, а второй адрес браузеру не нужен (как с API).
 */
function resolveExporterUrl(raw: string | undefined, origin: string): string | undefined {
  if (!raw) return undefined
  let url: URL
  try {
    url = new URL(raw, origin)
  } catch {
    console.warn(`Телеметрия выключена: адрес коллектора «${raw}» не разбирается`)
    return undefined
  }
  if (url.origin !== origin) {
    console.warn(`Телеметрия выключена: коллектор ${url.origin} не на адресе интерфейса`)
    return undefined
  }
  return url.href
}

function describe(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactMessage(error.message),
      stack: error.stack
        ? redactStack(error.stack, error.message ? `${error.name}: ${error.message}` : error.name)
        : undefined,
    }
  }
  let text: string
  try {
    text = String(error)
  } catch {
    text = typeof error
  }
  return { name: typeof error, message: redactMessage(text) }
}

function emit(tracer: Tracer, item: PendingError): void {
  const { name, message, stack } = describe(item.error)
  const attributes: Attributes = {
    [ERROR_SOURCE_ATTRIBUTE]: item.source,
    'url.path': redactUrl(item.path),
  }
  if (item.error instanceof ApiError && item.error.traceId) {
    attributes[API_TRACE_ID_ATTRIBUTE] = item.error.traceId
  }
  if (item.componentStack) {
    attributes[COMPONENT_STACK_ATTRIBUTE] = redactStack(item.componentStack)
  }
  const span = tracer.startSpan('exception', { attributes, startTime: item.time })
  span.recordException({ name, message, stack }, item.time)
  span.setStatus({ code: SpanStatusCode.ERROR, message })
  span.end(item.time)
}

/**
 * Телеметрия кабинета: ошибки и запросы к API в коллектор OpenTelemetry. Без адреса
 * коллектора — ничего не загружает и никуда не ходит, ошибки только пишутся в консоль.
 */
export function createTelemetry({
  exporterUrl = OTEL_EXPORTER_URL,
  apiBaseUrl = API_V1_BASE_URL,
  serviceVersion = APP_VERSION,
  environment = OTEL_ENVIRONMENT,
  origin = window.location.origin,
  loadSdk = () => import('./sdk'),
}: TelemetryOptions = {}): Telemetry {
  const url = resolveExporterUrl(exporterUrl, origin)
  let sdk: Sdk | undefined
  let pending: PendingError[] = []
  let reported = 0
  let failed = false

  function reportError(error: unknown, source: ErrorSource, componentStack?: string) {
    if (!url || failed || reported >= ERROR_REPORT_LIMIT) return
    reported++
    const item = {
      error,
      source,
      componentStack,
      time: Date.now(),
      path: window.location.pathname,
    }
    if (sdk) emit(sdk.tracer, item)
    else pending.push(item)
  }

  // Обработчики заменяют вывод React в консоль по умолчанию — пишем туда сами.
  const rootOptions: Telemetry['rootOptions'] = {
    onCaughtError(error, info) {
      console.error(error)
      reportError(error, 'react', info.componentStack)
    },
    onUncaughtError(error, info) {
      console.error(error)
      reportError(error, 'react', info.componentStack)
    },
    onRecoverableError(error, info) {
      console.error(error)
      reportError(error, 'react', info.componentStack)
    },
  }

  if (!url) {
    return {
      enabled: false,
      reportError,
      rootOptions,
      ready: Promise.resolve(),
      flush: () => Promise.resolve(),
      shutdown: () => Promise.resolve(),
    }
  }

  const onError = (event: ErrorEvent) => reportError(event.error ?? event.message, 'window.error')
  const onRejection = (event: PromiseRejectionEvent) =>
    reportError(event.reason, 'unhandledrejection')
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  const ready = loadSdk()
    .then(({ startSdk }) => {
      sdk = startSdk({
        exporterUrl: url,
        apiUrl: new URL(apiBaseUrl, origin).href.replace(/\/$/, ''),
        serviceVersion,
        environment,
      })
      for (const item of pending) emit(sdk.tracer, item)
    })
    .catch((error: unknown) => {
      failed = true
      console.warn('Телеметрия не загрузилась', error)
    })
    .finally(() => {
      pending = []
    })

  return {
    enabled: true,
    reportError,
    rootOptions,
    ready,
    flush: async () => {
      await ready
      await sdk?.flush()
    },
    async shutdown() {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      await ready
      await sdk?.shutdown()
    },
  }
}
