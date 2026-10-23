import { act } from '@testing-library/react'
import { InMemorySpanExporter, type ReadableSpan } from '@opentelemetry/sdk-trace'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiFetch } from '@/shared/api'
import { ErrorBoundary } from '@/shared/ui'

import { createTelemetry, ERROR_REPORT_LIMIT, type Telemetry, type TelemetryOptions } from '.'
import { startSdk } from './sdk'

const ORIGIN = window.location.origin
const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736'

let telemetry: Telemetry | undefined

afterEach(async () => {
  await telemetry?.shutdown()
  telemetry = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** `fetch`, который на всё отвечает `200` с `X-Trace-ID`, и журнал заголовков запросов. */
function stubApi() {
  const calls: { url: string; headers: Headers }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | Request, init: RequestInit = {}) => {
      calls.push({ url: String(input), headers: new Headers(init.headers) })
      return new Response('[]', { status: 200, headers: { 'X-Trace-ID': TRACE_ID } })
    }),
  )
  return calls
}

/** Телеметрия с настоящим SDK и экспортёром в память вместо коллектора. */
function startWithMemory(options: TelemetryOptions = {}) {
  const exporter = new InMemorySpanExporter()
  telemetry = createTelemetry({
    exporterUrl: '/otlp/v1/traces',
    serviceVersion: 'abc1234',
    environment: 'production',
    loadSdk: async () => ({ startSdk: (config) => startSdk(config, exporter) }),
    ...options,
  })
  const current = telemetry
  async function spans(): Promise<ReadableSpan[]> {
    await current.flush()
    return exporter.getFinishedSpans()
  }
  return { telemetry: current, spans }
}

function exceptionEvent(span: ReadableSpan) {
  return span.events.find((event) => event.name === 'exception')?.attributes ?? {}
}

describe('без адреса коллектора', () => {
  it('не загружает SDK, не ходит в коллектор и не ставит traceparent', async () => {
    const calls = stubApi()
    const loadSdk = vi.fn()
    telemetry = createTelemetry({ exporterUrl: undefined, loadSdk })

    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }))
    telemetry.reportError(new Error('boom'), 'react')
    await apiFetch('/repositories')
    await telemetry.ready

    expect(telemetry.enabled).toBe(false)
    expect(loadSdk).not.toHaveBeenCalled()
    expect(calls.map((call) => call.url)).toEqual(['/api/v1/repositories'])
    expect(calls[0].headers.has('traceparent')).toBe(false)
  })

  it('SDK получает абсолютный адрес коллектора на адресе интерфейса', async () => {
    const startSdkSpy = vi.fn((config: Parameters<typeof startSdk>[0]) =>
      startSdk(config, new InMemorySpanExporter()),
    )
    telemetry = createTelemetry({
      exporterUrl: '/otlp/v1/traces',
      loadSdk: async () => ({ startSdk: startSdkSpy }),
    })
    await telemetry.ready

    expect(startSdkSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        exporterUrl: `${ORIGIN}/otlp/v1/traces`,
        apiUrl: `${ORIGIN}/api/v1`,
      }),
    )
  })

  it('коллектор другого origin выключает экспорт с предупреждением', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loadSdk = vi.fn()
    telemetry = createTelemetry({ exporterUrl: 'https://collector.example/v1/traces', loadSdk })

    expect(telemetry.enabled).toBe(false)
    expect(loadSdk).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('https://collector.example'))
  })
})

describe('ошибки', () => {
  it('необработанная ошибка уходит спаном exception с отфильтрованным сообщением', async () => {
    const { spans } = startWithMemory()
    await telemetry!.ready
    window.history.pushState({}, '', '/app/reviews/12?tab=diff')

    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new Error(`Запрос /api/v1/x?cursor=abc упал, token ghp_${'a'.repeat(36)}`),
      }),
    )

    const [span] = await spans()
    expect(span.name).toBe('exception')
    expect(span.status.code).toBe(2) // ERROR
    expect(span.attributes).toMatchObject({
      'app.error.source': 'window.error',
      'url.path': '/app/reviews/12',
    })
    expect(exceptionEvent(span)).toMatchObject({
      'exception.type': 'Error',
      'exception.message': 'Запрос /api/v1/x упал, token [скрыто]',
    })
    expect(span.resource.attributes).toMatchObject({
      'service.name': 'dmc-268-ui',
      'service.version': 'abc1234',
      'deployment.environment.name': 'production',
    })
  })

  it('необработанный отказ промиса с ApiError несёт trace_id API', async () => {
    const { spans } = startWithMemory()

    const event = Object.assign(new Event('unhandledrejection'), {
      reason: new ApiError(500, 'Сбой', 'INTERNAL', TRACE_ID),
    })
    window.dispatchEvent(event)

    const [span] = await spans()
    expect(span.attributes).toMatchObject({
      'app.error.source': 'unhandledrejection',
      'app.api.trace_id': TRACE_ID,
    })
  })

  it('многострочное сообщение не протекает в стектрейс', async () => {
    const { telemetry, spans } = startWithMemory()

    telemetry.reportError(
      new Error('первая строка\n    at leaked (https://host/diff/secret.ts:1:2)'),
      'react',
    )

    const event = exceptionEvent((await spans())[0])
    expect(event['exception.message']).toBe('первая строка')
    expect(event['exception.stacktrace']).not.toContain('leaked')
  })

  it('ошибка до загрузки SDK уходит после загрузки', async () => {
    let load: () => void = () => {}
    const loaded = new Promise<void>((resolve) => (load = resolve))
    const exporter = new InMemorySpanExporter()
    telemetry = createTelemetry({
      exporterUrl: '/otlp/v1/traces',
      loadSdk: async () => {
        await loaded
        return { startSdk: (config) => startSdk(config, exporter) }
      },
    })

    telemetry.reportError(new Error('рано'), 'react')
    load()
    await telemetry.flush()

    expect(exporter.getFinishedSpans()).toHaveLength(1)
  })

  it(`отправляет не больше ${ERROR_REPORT_LIMIT} ошибок за загрузку страницы`, async () => {
    const { telemetry, spans } = startWithMemory()

    for (let i = 0; i < 1000; i++) telemetry.reportError(new Error(`ошибка ${i}`), 'react')

    expect(await spans()).toHaveLength(ERROR_REPORT_LIMIT)
  })

  it('ошибка рендера, перехваченная ErrorBoundary, уходит с источником react', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { telemetry, spans } = startWithMemory()
    function Broken(): never {
      throw new Error('рендер упал')
    }
    const container = document.createElement('div')
    const root = createRoot(container, telemetry.rootOptions)

    act(() =>
      root.render(
        <ErrorBoundary fallback={() => 'сбой'}>
          <Broken />
        </ErrorBoundary>,
      ),
    )
    act(() => root.unmount())

    const [span] = await spans()
    expect(span.attributes['app.error.source']).toBe('react')
    expect(span.attributes['react.component_stack']).toContain('Broken')
    expect(exceptionEvent(span)).toMatchObject({
      'exception.type': 'Error',
      'exception.message': 'рендер упал',
      'exception.stacktrace': expect.stringContaining('Broken'),
    })
  })
})

describe('запросы', () => {
  it('запрос к API несёт traceparent, спан — адрес без query и trace_id API', async () => {
    const calls = stubApi()
    const { telemetry, spans } = startWithMemory()
    await telemetry.ready

    await apiFetch('/reviews?repository_id=7')

    expect(calls[0].headers.get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
    await vi.waitFor(async () => expect(await spans()).toHaveLength(1))
    const [span] = await spans()
    expect(span.attributes).toMatchObject({
      'http.request.method': 'GET',
      'http.response.status_code': 200,
      'url.full': `${ORIGIN}/api/v1/reviews`,
      'app.api.trace_id': TRACE_ID,
    })
    expect(calls[0].headers.get('traceparent')).toContain(span.spanContext().spanId)
  })

  it('запрос не к API идёт без спана и без traceparent', async () => {
    const calls = stubApi()
    const { telemetry, spans } = startWithMemory()
    await telemetry.ready

    await fetch('https://example.com/data')
    await fetch('/assets/data.json')
    // Контрольный запрос к API: спаны закрываются по таймеру по порядку, поэтому когда
    // появился его спан, спаны запросов выше уже были бы закрыты.
    await apiFetch('/repositories')

    expect(calls.slice(0, 2).every((call) => !call.headers.has('traceparent'))).toBe(true)
    await vi.waitFor(async () => expect(await spans()).not.toHaveLength(0))
    expect((await spans()).map((span) => span.attributes['url.full'])).toEqual([
      `${ORIGIN}/api/v1/repositories`,
    ])
  })
})
