/**
 * Summary сборки (`scripts/build-summary.mjs`): метрики из каталога assets и
 * markdown по метрикам, базе develop и отчётам сканеров. Фикстуры сканеров —
 * `.github/tests/fixtures/build-summary/`. JS, а не TS: см. stand-ssh.test.mjs.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it } from 'vitest'
import {
  bytes,
  collectBundle,
  delta,
  render,
  stableName,
  trivyCounts,
} from '../../scripts/build-summary.mjs'

const ROOT = process.cwd()
const SCRIPT = join(ROOT, 'scripts/build-summary.mjs')
const FIXTURES = join(ROOT, '.github/tests/fixtures/build-summary')
const fixture = (name) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'))

const dirs = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'build-summary-'))
  dirs.push(d)
  return d
}

const IMAGE = { name: 'dmc268-ui:ci', id: 'sha256:abc', size: 61_000_000, compressed: 20_500_000 }
const METRICS = {
  bundle: [
    { name: 'index-BBBBBBBB.js', type: 'js', size: 230_000, gzip: 70_000 },
    { name: 'chunk-BBBBBBBB.js', type: 'js', size: 5000, gzip: 2000 },
    { name: 'index-BBBBBBBB.css', type: 'css', size: 20_000, gzip: 5000 },
    { name: 'new-BBBBBBBB.js', type: 'js', size: 1000, gzip: 500 },
  ],
  image: IMAGE,
}

describe('форматирование', () => {
  it('байты и разница', () => {
    expect(bytes(512)).toBe('512 B')
    expect(bytes(2048)).toBe('2.0 KiB')
    expect(bytes(3 * 1024 * 1024)).toBe('3.00 MiB')
    expect(delta(110, 100)).toBe('+10 B (+10.0%)')
    expect(delta(90, 100)).toBe('−10 B (−10.0%)')
    expect(delta(100, 100)).toBe('0')
    expect(delta(100, undefined)).toBe('—')
  })

  it('имя без хеша Vite', () => {
    expect(stableName('index-Bx3k9Za1.js')).toBe('index.js')
    expect(stableName('vendor-react-D_a-9Zb1.css')).toBe('vendor-react.css')
    expect(stableName('logo.svg')).toBe('logo.svg')
  })
})

describe('collect', () => {
  it('берёт .gz рядом, иначе считает gzip, и пропускает не js и css', () => {
    const dir = tmp()
    writeFileSync(join(dir, 'a-AAAAAAAA.js'), 'x'.repeat(1000))
    writeFileSync(join(dir, 'a-AAAAAAAA.js.gz'), 'gz!')
    writeFileSync(join(dir, 'b-AAAAAAAA.css'), 'y'.repeat(500))
    writeFileSync(join(dir, 'logo.svg'), '<svg/>')
    const files = collectBundle(dir)
    expect(files).toEqual([
      { name: 'a-AAAAAAAA.js', type: 'js', size: 1000, gzip: 3 },
      {
        name: 'b-AAAAAAAA.css',
        type: 'css',
        size: 500,
        gzip: gzipSync('y'.repeat(500), { level: 9 }).length,
      },
    ])
  })
})

describe('render', () => {
  const env = {
    GITHUB_WORKFLOW: 'CI',
    GITHUB_RUN_ID: '42',
    GITHUB_JOB: 'image',
    GITHUB_SHA: 'a'.repeat(40),
  }

  it('с базой: итоги по типам, топ файлов, разница бандла и образа', () => {
    const md = render({ metrics: METRICS, base: fixture('base.json'), env })
    expect(md).toContain('`cicd.pipeline.task.name` | `image`')
    // js: 235500 против 205000 байт, gzip 72500 против 62000
    expect(md).toContain(
      '| js | 3 | 230.5 KiB | 70.8 KiB | +30.3 KiB (+15.1%) | +10.3 KiB (+16.9%) |',
    )
    // топ — по размеру, index.js первым, Δ по имени без хеша
    expect(md.indexOf('`index-BBBBBBBB.js`')).toBeLessThan(md.indexOf('`chunk-BBBBBBBB.js`'))
    expect(md).toMatch(/`index-BBBBBBBB.js` \| 224.6 KiB \| 68.4 KiB \| \+9.8 KiB/)
    expect(md).toMatch(/`new-BBBBBBBB.js` \| 1000 B \| 500 B \| —/)
    expect(md).toContain('`dmc268.build.image.size` | 58.17 MiB | +976.6 KiB (+1.7%) |')
    expect(md).toContain('к последнему успешному прогону CI на develop')
  })

  it('без базы: абсолютные значения и пояснение', () => {
    const md = render({ metrics: METRICS, env })
    expect(md).toContain('Базы для сравнения нет')
    expect(md).toContain('| итого | 4 |')
    expect(md).not.toContain('(+')
  })

  it('trivy: по severity, с исправлением и unfixed', () => {
    const { counts, unfixedGate } = trivyCounts(fixture('trivy.json'))
    expect(counts.CRITICAL).toEqual({ fixed: 1, unfixed: 0 })
    expect(counts.LOW).toEqual({ fixed: 0, unfixed: 2 })
    expect(unfixedGate).toEqual(['CVE-2026-0002 (libbar)'])
    const md = render({ metrics: METRICS, trivy: fixture('trivy.json'), env })
    expect(md).toContain('| HIGH — роняет job, если есть исправление | 0 | 1 | 1 |')
    expect(md).toContain('- CVE-2026-0002 (libbar)')
  })

  it('hadolint: уровни и замечания ниже порога', () => {
    const md = render({ metrics: METRICS, hadolint: fixture('hadolint.json'), env })
    expect(md).toContain('| warning | 1 |')
    expect(md).toContain("| style — ниже порога job'а | 1 |")
    expect(md).toContain('- `DL3059`, строка 33')
    expect(md).not.toContain('- `DL3018`')
  })

  it('без отчётов сканеров разделов нет, чистый hadolint — одной строкой', () => {
    const md = render({ metrics: METRICS, env })
    expect(md).not.toContain('### trivy')
    expect(md).not.toContain('### hadolint')
    expect(render({ metrics: METRICS, hadolint: [], env })).toContain('Замечаний нет.')
  })
})

describe('CLI', () => {
  it('collect и render по файлам; нет метрик — сообщение, а не падение', () => {
    const dir = tmp()
    const assets = join(dir, 'assets')
    mkdirSync(assets)
    writeFileSync(join(assets, 'index-AAAAAAAA.js'), 'z'.repeat(4000))
    const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })
    const c = run(
      'collect',
      '--assets',
      assets,
      '--out',
      join(dir, 'm.json'),
      '--image-name',
      'i:ci',
      '--image-id',
      'sha256:1',
      '--image-size',
      '1000',
      '--image-compressed',
      '500',
    )
    expect(c.status).toBe(0)
    const r = run('render', '--metrics', join(dir, 'm.json'), '--base', join(dir, 'нет.json'))
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Базы для сравнения нет')
    expect(r.stdout).toContain('`i:ci`')
    const none = run('render', '--metrics', join(dir, 'нет.json'))
    expect(none.status).toBe(0)
    expect(none.stdout).toContain('Метрики не собраны')
  })
})
