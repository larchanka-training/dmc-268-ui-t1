/**
 * Фильтр всего, что уходит в телеметрию: сообщения и стектрейса ошибки, адресов
 * запросов. Сюда не должны попасть строка запроса, токены, код из диффа и тексты
 * замечаний (change `cabinet-browser-telemetry`). Второй рубеж — редакция в коллекторе.
 */

export const REDACTED = '[скрыто]'

const MESSAGE_LIMIT = 500
const STACK_FRAMES_LIMIT = 50
// Регулярки ниже на длинной строке без пробелов работают за квадратичное время
// (20 000 символов — больше полусекунды в обработчике ошибки), поэтому вход режется
// до них: с запасом, чтобы метка `[скрыто]` не сдвинула отрезку.
const INPUT_LIMIT = MESSAGE_LIMIT * 2
const FRAME_LIMIT = 1000

// Путь (абсолютный или от корня) и всё после `?` или `#` до пробела, кавычки или
// скобки; `:строка:колонка` кадра стека в конце сохраняется. Путь обязателен: иначе
// `?` в обычной фразе съедал бы её хвост.
const URL_WITH_QUERY =
  /((?:[a-z][a-z0-9+.-]*:\/\/[^\s/?#"'`]+)?\/[^\s?#"'`()]*)[?#][^\s"'`()]*?(?=(?::\d+:\d+)?(?:[\s"'`()]|$))/gi

// Строка запроса без пути впереди (`reviews?cursor=abc`): узнаём по `ключ=`.
const BARE_QUERY = /\?[\w.%-]+=[^\s"'`()]*/g

const TOKENS = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bBearer\s+[^\s"'`]+/gi,
  /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g,
  // Длинная случайная строка: ключ, сессия, sha. Имена файлов сборки короче.
  /[A-Za-z0-9_-]{32,}/g,
]

// Цитата длиннее 16 символов: код и тексты попадают в сообщения ошибок именно так
// (`Unexpected token … "<фрагмент>"`), а имена свойств (`reading 'map'`) короче.
const LONG_QUOTE = /(["'`])(?:(?!\1)[^\n]){17,}\1/g

// Обрезанная цитата: V8 в ошибке `JSON.parse` показывает 10 символов входа и
// многоточие (`"const secr"... is not valid JSON`) — это начало тела или кода.
const CUT_QUOTE = /(["'`])(?:(?!\1)[^\n])*\1\.\.\./g

/** Адрес без строки запроса и фрагмента. */
export function redactUrl(url: string): string {
  return url.split(/[?#]/, 1)[0]
}

/** Текст без адресов с параметрами, токенов и длинных цитат. */
export function redactText(text: string): string {
  let result = text.replace(URL_WITH_QUERY, '$1').replace(BARE_QUERY, '')
  for (const token of TOKENS) result = result.replace(token, REDACTED)
  return result
    .replace(CUT_QUOTE, (_, quote: string) => `${quote}${REDACTED}${quote}...`)
    .replace(LONG_QUOTE, (_, quote: string) => `${quote}${REDACTED}${quote}`)
}

/** Сообщение ошибки: первая строка после фильтра, не длиннее 500 символов. */
export function redactMessage(message: string): string {
  return redactText(message.split('\n', 1)[0].slice(0, INPUT_LIMIT)).slice(0, MESSAGE_LIMIT)
}

// Кадр стека V8 (`    at f (url:1:2)`) или Firefox и Safari (`f@url:1:2`).
const STACK_FRAME = /^\s*at\s|@\S*:\d+:\d+\s*$/

/**
 * Стектрейс: только строки кадров, не больше 50. Заголовок стека V8 (`header` —
 * `имя: сообщение`) повторяет сообщение со всеми строками: срезаем его целиком,
 * иначе строка сообщения, похожая на кадр, ушла бы в стектрейс. Сообщение уходит
 * отдельно, через `redactMessage`.
 */
export function redactStack(stack: string, header?: string): string {
  const frames = header && stack.startsWith(header) ? stack.slice(header.length) : stack
  return frames
    .split('\n')
    .map((line) => line.slice(0, FRAME_LIMIT))
    .filter((line) => STACK_FRAME.test(line))
    .slice(0, STACK_FRAMES_LIMIT)
    .map(redactText)
    .join('\n')
}
