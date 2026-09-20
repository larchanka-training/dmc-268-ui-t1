import { describe, expect, it } from 'vitest'

import rules from '../.agents/rules/frontend.md?raw'
import agents from '../AGENTS.md?raw'
import pkg from '../package.json'

/**
 * Правила, которые агент читает всегда, не должны отправлять его к несуществующей команде.
 * Проверяются только команды: прозу и формулировки тест не трогает.
 */
function quotedScripts(text: string): string[] {
  const matches = text.matchAll(/pnpm run ([a-z:-]+)/g)
  return [...new Set([...matches].map((match) => match[1]))]
}

describe('правила и команды проекта', () => {
  const declared = Object.keys(pkg.scripts)

  it.each([
    ['.agents/rules/frontend.md', rules],
    ['AGENTS.md', agents],
  ])('%s называет только существующие скрипты', (_name, text) => {
    expect(quotedScripts(text).filter((script) => !declared.includes(script))).toEqual([])
  })
})
