/**
 * Change со всеми закрытыми задачами должен быть заархивирован в том же PR.
 *
 * Порт dmc-268-api-t1/scripts/check_openspec_archived.py, держать в синхроне:
 * условие, текст ошибки и summary те же. JS, а не Python: стек фронта — Node,
 * тесты — vitest (`.github/tests/check-openspec-archived.test.mjs`).
 *
 * Читает `openspec list --json` со stdin. Падает, если в `openspec/changes/`
 * лежит change, у которого закрыты все задачи: такой change забыли
 * заархивировать, и его дельты не попали в `openspec/specs/`. Change с
 * незакрытой задачей — работа идёт или ждёт приёмки после мерджа — проверку
 * проходит, но попадает в список открытых в summary прогона, чтобы висящие
 * change были видны.
 *
 *   pnpm exec openspec list --json | node scripts/check-openspec-archived.mjs
 */
import { appendFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const isCount = (value) => Number.isInteger(value) && value >= 0

/** Change из вывода `openspec list --json`; вход с границы проверяется. */
export function parseChanges(text) {
  /** @type {unknown} */
  const data = JSON.parse(text)
  const changes = data && typeof data === 'object' && 'changes' in data ? data.changes : undefined
  if (!Array.isArray(changes)) throw new Error('в выводе openspec list --json нет массива changes')
  return changes.map((item) => {
    const { name, completedTasks, totalTasks } = item ?? {}
    if (typeof name !== 'string' || !isCount(completedTasks) || !isCount(totalTasks))
      throw new Error(`change ${String(name)}: нет имени или счётчиков задач`)
    return { name, completedTasks, totalTasks }
  })
}

/** Завершённые — все задачи закрыты; change без задач завершённым не считается. */
export function splitChanges(changes) {
  const isDone = (c) => c.totalTasks > 0 && c.completedTasks === c.totalTasks
  return { done: changes.filter(isDone), open: changes.filter((c) => !isDone(c)) }
}

export function summary(open) {
  const lines = ['## Открытые OpenSpec change', '']
  if (open.length === 0) lines.push('Нет.')
  else {
    lines.push('| Change | Задачи |', '| --- | --- |')
    for (const c of open) lines.push(`| \`${c.name}\` | ${c.completedTasks}/${c.totalTasks} |`)
  }
  return `${lines.join('\n')}\n`
}

export function errors(done) {
  return done.map(
    (c) =>
      `::error::change ${c.name}: все задачи закрыты, а change не заархивирован — ` +
      `\`openspec archive ${c.name}\` в этом PR`,
  )
}

// Поток, а не readFileSync(0): за пайпом stdin бывает неблокирующим, и
// синхронное чтение падает с EAGAIN.
async function readStdin() {
  let text = ''
  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) text += chunk
  return text
}

async function main() {
  const { done, open } = splitChanges(parseChanges(await readStdin()))
  const report = summary(open)
  const summaryFile = process.env.GITHUB_STEP_SUMMARY
  if (summaryFile) appendFileSync(summaryFile, report)
  else process.stdout.write(report)
  for (const line of errors(done)) process.stdout.write(`${line}\n`)
  return done.length > 0 ? 1 : 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await main()
