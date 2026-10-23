import { context, propagation, type Tracer } from '@opentelemetry/api'
import { W3CTraceContextPropagator } from '@opentelemetry/core'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { resourceFromAttributes } from '@opentelemetry/resources'
import {
  BatchSpanProcessor,
  StackContextManager,
  TracerProvider,
  type Span,
  type SpanExporter,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_URL_FULL,
} from '@opentelemetry/semantic-conventions'

import { API_TRACE_ID_ATTRIBUTE } from './attributes'
import { redactUrl } from './redact'

/**
 * SDK телеметрии — отдельный чанк: `index.ts` грузит его через `import()` только
 * при включённом экспорте, и без адреса коллектора в загрузке страницы его нет.
 */

export const SERVICE_NAME = 'dmc-268-ui'
// В стабильных семантических конвенциях имени нет — только в incubating.
const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name'

export type SdkConfig = {
  /** Абсолютный адрес приёмника OTLP/HTTP для трейсов. */
  exporterUrl: string
  /** Абсолютный адрес API: трассируются только запросы под ним. */
  apiUrl: string
  serviceVersion: string
  environment: string
}

export type Sdk = {
  tracer: Tracer
  flush: () => Promise<void>
  shutdown: () => Promise<void>
}

/** `url.full` без строки запроса — до того, как спан попадёт в очередь экспорта. */
const redactUrlProcessor: SpanProcessor = {
  onStart(span: Span) {
    const url = span.attributes[ATTR_URL_FULL]
    if (typeof url === 'string') span.setAttribute(ATTR_URL_FULL, redactUrl(url))
  },
  onEnd() {},
  forceFlush: () => Promise.resolve(),
  shutdown: () => Promise.resolve(),
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function startSdk(
  config: SdkConfig,
  exporter: SpanExporter = new OTLPTraceExporter({ url: config.exporterUrl }),
): Sdk {
  const provider = new TracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.environment,
    }),
    spanLimits: { attributeValueLengthLimit: 4096 },
    spanProcessors: [redactUrlProcessor, new BatchSpanProcessor({ exporter })],
  })

  // Без менеджера контекста активного спана нет, и `traceparent` не подставился бы.
  context.setGlobalContextManager(new StackContextManager().enable())
  propagation.setGlobalPropagator(new W3CTraceContextPropagator())

  // Всё, что не под адресом API, не трассируется: ни спана, ни `traceparent`.
  // API на том же адресе, что и интерфейс, поэтому CORS для заголовка не нужен.
  const notApi = new RegExp(`^(?!${escapeRegExp(config.apiUrl)}(?:[/?#]|$))`)
  const unregister = registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      new FetchInstrumentation({
        ignoreUrls: [notApi],
        ignoreNetworkEvents: true,
        applyCustomAttributesOnSpan(span, _request, result) {
          const traceId = 'headers' in result ? result.headers.get('X-Trace-ID') : null
          if (traceId) span.setAttribute(API_TRACE_ID_ATTRIBUTE, traceId)
        },
      }),
    ],
  })

  return {
    tracer: provider.getTracer(SERVICE_NAME),
    flush: () => provider.forceFlush(),
    async shutdown() {
      unregister()
      await provider.shutdown()
      propagation.disable()
      context.disable()
    },
  }
}
