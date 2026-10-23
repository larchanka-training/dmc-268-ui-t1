/** Имена атрибутов кабинета: общие для основного бандла и чанка SDK. */

/** `X-Trace-ID` ответа API — на спане запроса и на спане ошибки `ApiError`. */
export const API_TRACE_ID_ATTRIBUTE = 'app.api.trace_id'

/** Откуда пришла ошибка: `window.error`, `unhandledrejection`, `react`. */
export const ERROR_SOURCE_ATTRIBUTE = 'app.error.source'

/** Стек компонентов React для ошибки рендера. */
export const COMPONENT_STACK_ATTRIBUTE = 'react.component_stack'
