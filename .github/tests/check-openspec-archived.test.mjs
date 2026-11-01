/**
 * Проверка «change с закрытыми задачами заархивирован»
 * (`scripts/check-openspec-archived.mjs`, шаг job'а `openspec` в ci.yml).
 *
 * Скрипт гоняется и функциями, и настоящим node с `openspec list --json` на
 * stdin: в CI он стоит за пайпом, и код выхода — единственное, что видит job.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import {
  errors,
  parseChanges,
  splitChanges,
  summary,
} from '../../scripts/check-openspec-archived.mjs'

const SCRIPT = join(process.cwd(), 'scripts/check-openspec-archived.mjs')

const change = (name, completedTasks, totalTasks) => ({
  name,
  completedTasks,
  totalTasks,
  lastModified: '2026-11-01T00:00:00.000Z',
  status: completedTasks === totalTasks ? 'complete' : 'in-progress',
})

const listJson = (...changes) =>
  JSON.stringify({ changes, root: { path: '/repo', source: 'nearest' } })

const dirs = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function run(input, env = {}) {
  // Summary раннера, если тест идёт в CI, сюда не пишется.
  const rest = { ...process.env }
  delete rest.GITHUB_STEP_SUMMARY
  return spawnSync(process.execPath, [SCRIPT], {
    input,
    encoding: 'utf8',
    env: { ...rest, ...env },
  })
}

describe('разбор openspec list --json', () => {
  it('отдаёт change из поля changes', () => {
    expect(parseChanges(listJson(change('a', 1, 2)))).toEqual([
      { name: 'a', completedTasks: 1, totalTasks: 2 },
    ])
  })

  it('падает на выводе без массива changes', () => {
    expect(() => parseChanges('{}')).toThrow(/changes/)
  })

  it('падает на change без счётчиков задач', () => {
    expect(() => parseChanges(JSON.stringify({ changes: [{ name: 'a' }] }))).toThrow(/a/)
  })

  it('падает на не-JSON', () => {
    expect(() => parseChanges('No active changes')).toThrow()
  })
})

describe('завершённые и открытые change', () => {
  it('change со всеми закрытыми задачами — завершённый', () => {
    const { done, open } = splitChanges([change('a', 3, 3), change('b', 2, 3)])
    expect(done.map((c) => c.name)).toEqual(['a'])
    expect(open.map((c) => c.name)).toEqual(['b'])
  })

  it('change без задач завершённым не считается', () => {
    expect(splitChanges([change('empty', 0, 0)]).done).toEqual([])
  })

  it('summary перечисляет открытые change со счётчиком задач', () => {
    expect(summary([change('b', 2, 3)])).toContain('| `b` | 2/3 |')
  })

  it('summary без открытых change — «Нет.»', () => {
    expect(summary([])).toContain('Нет.')
  })

  it('ошибка называет change и команду архивации', () => {
    expect(errors([change('a', 3, 3)])).toEqual([
      '::error::change a: все задачи закрыты, а change не заархивирован — `openspec archive a` в этом PR',
    ])
  })
})

describe('запуск скрипта', () => {
  it('падает с кодом 1 на завершённом незаархивированном change', () => {
    const result = run(listJson(change('done', 4, 4), change('wip', 1, 4)))
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('::error::change done:')
    expect(result.stdout).not.toContain('::error::change wip:')
  })

  it('проходит, когда завершённых change нет', () => {
    const result = run(listJson(change('wip', 1, 4)))
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('| `wip` | 1/4 |')
  })

  it('пишет summary в GITHUB_STEP_SUMMARY, а не в stdout', () => {
    const dir = mkdtempSync(join(tmpdir(), 'openspec-archived-'))
    dirs.push(dir)
    const file = join(dir, 'summary.md')
    writeFileSync(file, '')
    const result = run(listJson(change('wip', 1, 4)), { GITHUB_STEP_SUMMARY: file })
    expect(result.status).toBe(0)
    expect(readFileSync(file, 'utf8')).toContain('## Открытые OpenSpec change')
    expect(result.stdout).not.toContain('Открытые OpenSpec change')
  })

  it('падает на нечитаемом входе, а не проходит молча', () => {
    const result = run('')
    expect(result.status).not.toBe(0)
  })
})
