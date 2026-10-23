import { describe, expect, it } from 'vitest'

import { REDACTED, redactMessage, redactStack, redactText, redactUrl } from './redact'

describe('redactUrl', () => {
  it('убирает строку запроса и фрагмент', () => {
    expect(redactUrl('https://host/api/v1/reviews?repository_id=7#top')).toBe(
      'https://host/api/v1/reviews',
    )
    expect(redactUrl('/app/reviews/12?tab=diff')).toBe('/app/reviews/12')
  })
})

describe('redactText', () => {
  it('вырезает строку запроса из адресов в тексте', () => {
    expect(redactText('Запрос https://host/api/v1/x?cursor=abc#frag упал')).toBe(
      'Запрос https://host/api/v1/x упал',
    )
    expect(redactText('Запрос /api/v1/reviews?limit=20&cursor=eyJ завершился ошибкой 500')).toBe(
      'Запрос /api/v1/reviews завершился ошибкой 500',
    )
  })

  it('вырезает строку запроса без пути впереди', () => {
    expect(redactText('fetch failed reviews?cursor=abc&limit=20 offline')).toBe(
      'fetch failed reviews offline',
    )
  })

  it('не трогает вопрос в обычной фразе', () => {
    expect(redactText('Что случилось? Ничего.')).toBe('Что случилось? Ничего.')
  })

  it('заменяет токены меткой', () => {
    const github = `ghp_${'a1B2'.repeat(9)}`
    expect(redactText(`token ${github} отклонён`)).toBe(`token ${REDACTED} отклонён`)
    expect(redactText(`github_pat_${'x'.repeat(30)}`)).toBe(REDACTED)
    expect(redactText('Authorization: Bearer abc.def-ghi')).toBe(`Authorization: ${REDACTED}`)
    expect(redactText('jwt eyJhbGciOi.eyJzdWIiOi.c2lnbmF0dXJl')).toBe(`jwt ${REDACTED}`)
    expect(redactText(`ключ ${'k'.repeat(40)}`)).toBe(`ключ ${REDACTED}`)
  })

  it('заменяет обрезанную цитату из настоящей ошибки JSON.parse', () => {
    let message = ''
    try {
      JSON.parse('const secret = readFile()')
    } catch (error) {
      message = (error as Error).message
    }

    expect(message).toContain('"const secr"...')
    expect(redactText(message)).toBe(`Unexpected token 'c', "${REDACTED}"... is not valid JSON`)
  })

  it('заменяет длинные цитаты — код и тексты — и оставляет короткие имена', () => {
    expect(redactText(`Unexpected token '<', "const secret = readFile()" is not valid JSON`)).toBe(
      `Unexpected token '<', "${REDACTED}" is not valid JSON`,
    )
    expect(redactText("Cannot read properties of undefined (reading 'map')")).toBe(
      "Cannot read properties of undefined (reading 'map')",
    )
    expect(redactText('замечание `Здесь утечка соединения с базой`')).toBe(
      `замечание \`${REDACTED}\``,
    )
  })
})

describe('redactMessage', () => {
  it('берёт первую строку и ограничивает длину', () => {
    expect(redactMessage('первая\nвторая с кодом')).toBe('первая')
    expect(redactMessage('ы'.repeat(1000))).toHaveLength(500)
  })

  it('длинная строка без пробелов не вешает обработчик ошибки', () => {
    const started = performance.now()
    redactMessage(`bad payload ${'a'.repeat(100_000)}`)
    redactMessage('/a'.repeat(50_000))
    redactStack(`    at f (${'/a'.repeat(50_000)}:1:2)`)
    expect(performance.now() - started).toBeLessThan(100)
  })
})

describe('redactStack', () => {
  it('оставляет только кадры и чистит их', () => {
    const stack = [
      'Error: boom "const token = process.env.GITHUB_TOKEN"',
      '    at render (https://host/assets/index-a1b2.js:1:200)',
      '    at load (https://host/assets/index-a1b2.js?v=1:2:10)',
      'commit@https://host/assets/react-c3d4.js:3:30',
    ].join('\n')

    expect(redactStack(stack)).toBe(
      [
        '    at render (https://host/assets/index-a1b2.js:1:200)',
        '    at load (https://host/assets/index-a1b2.js:2:10)',
        'commit@https://host/assets/react-c3d4.js:3:30',
      ].join('\n'),
    )
  })

  it('срезает заголовок со строками сообщения, похожими на кадры', () => {
    const message = 'boom\n    at leaked (https://host/diff/secret.ts:1:2)'
    const stack = `Error: ${message}\n    at render (https://host/assets/a.js:1:2)`

    expect(redactStack(stack, `Error: ${message}`)).toBe(
      '    at render (https://host/assets/a.js:1:2)',
    )
  })

  it('не больше 50 кадров', () => {
    const stack = Array.from({ length: 80 }, (_, i) => `    at f${i} (https://host/a.js:1:${i})`)
    expect(redactStack(stack.join('\n')).split('\n')).toHaveLength(50)
  })
})
