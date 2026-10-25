/**
 * Summary job'а `image` в `$GITHUB_STEP_SUMMARY`: размер бандла и образа,
 * находки trivy и замечания hadolint.
 *
 * Две команды, только стандартная библиотека Node (на ubuntu-latest он есть):
 *
 *   node scripts/build-summary.mjs collect --assets DIR --out metrics.json \
 *     --image-name N --image-id ID --image-size BYTES --image-compressed BYTES
 *   node scripts/build-summary.mjs render --metrics metrics.json \
 *     [--base base.json] [--trivy trivy.json] [--hadolint hadolint.json] \
 *     >> "$GITHUB_STEP_SUMMARY"
 *
 * `collect` обходит `dist/assets`, вынутый из образа (js и css): размер файла
 * и размер `.gz` рядом (его кладёт Dockerfile; нет файла — считаем gzip -9
 * сами). `render` собирает markdown; нет файла сканера или базы — нет и
 * раздела, а не падение: summary пишется и после упавшего шага. Разницу с
 * develop считает по `base.json` — метрикам последнего успешного прогона develop
 * (см. design change `ci-build-summary`).
 *
 * Ключи значений — по семантическим соглашениям OpenTelemetry (`cicd.pipeline.*`,
 * `container.image.*`, `vcs.ref.*`), чтобы отправить их в коллектор без
 * переименований; своё — в пространстве `dmc268.build.*`.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { gzipSync } from 'node:zlib'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const BUNDLE_TYPES = ['js', 'css']
const TOP_FILES = 5
const MAX_LISTED = 10
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']
// Что роняет job: trivy — HIGH и CRITICAL с исправлением (ignore-unfixed),
// hadolint — всё от info и выше (failure-threshold по умолчанию у action).
const TRIVY_GATE = ['CRITICAL', 'HIGH']
const HADOLINT_LEVELS = ['error', 'warning', 'info', 'style']
const HADOLINT_GATE = ['error', 'warning', 'info']

// --- метрики -------------------------------------------------------------

/** Имя без хеша Vite: `index-Bx3k9Za1.js` -> `index.js`. */
export function stableName(name) {
  return name.replace(/-[A-Za-z0-9_-]{8}(\.[^.]+)$/, '$1')
}

export function collectBundle(assetsDir) {
  const files = []
  for (const name of readdirSync(assetsDir).sort()) {
    const type = extname(name).slice(1)
    if (!BUNDLE_TYPES.includes(type)) continue
    const path = join(assetsDir, name)
    if (!statSync(path).isFile()) continue
    const size = statSync(path).size
    const gz = `${path}.gz`
    const gzip = existsSync(gz)
      ? statSync(gz).size
      : gzipSync(readFileSync(path), { level: 9 }).length
    files.push({ name, type, size, gzip })
  }
  return files
}

export function collect({ assetsDir, image }) {
  return { bundle: collectBundle(assetsDir), image }
}

// --- форматирование ------------------------------------------------------

export function bytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`
  return `${(n / 1024 / 1024).toFixed(2)} MiB`
}

export function delta(now, before) {
  if (before === undefined || before === null) return '—'
  const d = now - before
  if (d === 0) return '0'
  const sign = d > 0 ? '+' : '−'
  const pct = before === 0 ? '' : ` (${sign}${((Math.abs(d) / before) * 100).toFixed(1)}%)`
  return `${sign}${bytes(Math.abs(d))}${pct}`
}

const sum = (items, key) => items.reduce((acc, f) => acc + f[key], 0)

// --- разделы -------------------------------------------------------------

function bundleSection(metrics, base) {
  const files = metrics.bundle ?? []
  const baseFiles = base?.bundle
  const out = ['### Бандл', '']
  if (files.length === 0) return [...out, 'Файлов js и css в `dist/assets` нет.', '']
  out.push(
    '| Тип | Файлов `dmc268.build.bundle.files` | Размер `dmc268.build.bundle.size` | gzip `dmc268.build.bundle.size.gzip` | Δ размера | Δ gzip |',
    '|---|---|---|---|---|---|',
  )
  const rows = [...BUNDLE_TYPES.map((t) => [t, (f) => f.type === t]), ['итого', () => true]]
  for (const [label, pick] of rows) {
    const now = files.filter(pick)
    if (now.length === 0 && label !== 'итого') continue
    const was = baseFiles?.filter(pick)
    out.push(
      `| ${label} | ${now.length} | ${bytes(sum(now, 'size'))} | ${bytes(sum(now, 'gzip'))} | ${delta(sum(now, 'size'), was && sum(was, 'size'))} | ${delta(sum(now, 'gzip'), was && sum(was, 'gzip'))} |`,
    )
  }
  const stable = new Map()
  for (const f of baseFiles ?? []) {
    const key = stableName(f.name)
    stable.set(key, (stable.get(key) ?? 0) + f.gzip)
  }
  out.push('', `Крупнейшие файлы (топ ${TOP_FILES} по размеру):`, '')
  out.push('| Файл | Размер | gzip | Δ gzip |', '|---|---|---|---|')
  for (const f of [...files].sort((a, b) => b.size - a.size).slice(0, TOP_FILES)) {
    const was = baseFiles ? stable.get(stableName(f.name)) : undefined
    out.push(`| \`${f.name}\` | ${bytes(f.size)} | ${bytes(f.gzip)} | ${delta(f.gzip, was)} |`)
  }
  out.push(
    '',
    'Δ по файлам — по имени без хеша; новый файл без пары в develop показан прочерком.',
    '',
  )
  return out
}

function imageSection(metrics, base) {
  const img = metrics.image
  if (!img) return []
  const bi = base?.image
  const out = ['### Образ', '', '| Что | Ключ | Значение | Δ develop |', '|---|---|---|---|']
  out.push(`| Образ | \`container.image.name\` | \`${img.name}\` | |`)
  if (img.id) out.push(`| ID | \`container.image.id\` | \`${img.id.slice(0, 19)}\` | |`)
  out.push(
    `| Размер | \`dmc268.build.image.size\` | ${bytes(img.size)} | ${delta(img.size, bi?.size)} |`,
  )
  if (img.compressed) {
    out.push(
      `| Сжатый (\`docker save\` \\| gzip) | \`dmc268.build.image.size.compressed\` | ${bytes(img.compressed)} | ${delta(img.compressed, bi?.compressed)} |`,
    )
  }
  return [...out, '']
}

/** Находки trivy: по severity всего, с исправлением и без. */
export function trivyCounts(report) {
  const counts = Object.fromEntries(SEVERITIES.map((s) => [s, { fixed: 0, unfixed: 0 }]))
  const unfixedGate = []
  for (const result of report.Results ?? []) {
    for (const v of result.Vulnerabilities ?? []) {
      const sev = SEVERITIES.includes(v.Severity) ? v.Severity : 'UNKNOWN'
      if (v.FixedVersion) counts[sev].fixed++
      else {
        counts[sev].unfixed++
        if (TRIVY_GATE.includes(sev)) unfixedGate.push(`${v.VulnerabilityID} (${v.PkgName})`)
      }
    }
  }
  return { counts, unfixedGate }
}

function trivySection(report) {
  if (!report) return []
  const { counts, unfixedGate } = trivyCounts(report)
  const out = [
    '### trivy',
    '',
    '| Severity `dmc268.build.scan.severity` | С исправлением | Без исправления (`unfixed`) | Всего `dmc268.build.scan.vulnerabilities` |',
    '|---|---|---|---|',
  ]
  for (const s of SEVERITIES) {
    const { fixed, unfixed } = counts[s]
    const gate = TRIVY_GATE.includes(s) ? ' — роняет job, если есть исправление' : ''
    out.push(`| ${s}${gate} | ${fixed} | ${unfixed} | ${fixed + unfixed} |`)
  }
  if (unfixedGate.length > 0) {
    out.push('', 'HIGH и CRITICAL без исправления (job не роняют, `ignore-unfixed`):', '')
    for (const id of unfixedGate.slice(0, MAX_LISTED)) out.push(`- ${id}`)
    if (unfixedGate.length > MAX_LISTED) out.push(`- … и ещё ${unfixedGate.length - MAX_LISTED}`)
  }
  return [...out, '']
}

function hadolintSection(findings) {
  if (!findings) return []
  const out = ['### hadolint', '']
  if (findings.length === 0) return [...out, 'Замечаний нет.', '']
  out.push(
    '| Уровень `dmc268.build.lint.level` | Замечаний `dmc268.build.lint.findings` |',
    '|---|---|',
  )
  for (const level of HADOLINT_LEVELS) {
    const n = findings.filter((f) => f.level === level).length
    if (n === 0) continue
    out.push(`| ${level}${HADOLINT_GATE.includes(level) ? '' : " — ниже порога job'а"} | ${n} |`)
  }
  out.push('', "Порог job'а — `info`: замечания уровня `style` его не роняют.", '')
  const below = findings.filter((f) => !HADOLINT_GATE.includes(f.level))
  for (const f of below.slice(0, MAX_LISTED)) {
    out.push(`- \`${f.code}\`, строка ${f.line}: ${f.message}`)
  }
  if (below.length > MAX_LISTED) out.push(`- … и ещё ${below.length - MAX_LISTED}`)
  return [...out, '']
}

function pipelineSection(env) {
  const run = env.GITHUB_RUN_ID ?? ''
  const url =
    env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY
      ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${run}`
      : ''
  return [
    '| Что | Ключ | Значение |',
    '|---|---|---|',
    `| Workflow | \`cicd.pipeline.name\` | ${env.GITHUB_WORKFLOW ?? ''} |`,
    `| Прогон | \`cicd.pipeline.run.id\` | ${url ? `[${run}](${url})` : run} |`,
    `| Job | \`cicd.pipeline.task.name\` | \`${env.GITHUB_JOB ?? ''}\` (\`cicd.pipeline.task.type\`: \`build\`) |`,
    `| Коммит | \`vcs.ref.head.revision\` | \`${(env.GITHUB_SHA ?? '').slice(0, 12)}\` |`,
    '',
  ]
}

export function render({ metrics, base, trivy, hadolint, env = {} }) {
  const out = ['## Summary сборки', '', ...pipelineSection(env)]
  out.push(
    base
      ? 'Δ — к последнему успешному прогону CI на develop.'
      : 'Базы для сравнения нет: в кэше нет метрик develop (первый прогон или кэш устарел). Показаны абсолютные значения.',
    '',
  )
  out.push(
    ...bundleSection(metrics, base),
    ...imageSection(metrics, base),
    ...trivySection(trivy),
    ...hadolintSection(hadolint),
  )
  return out.join('\n')
}

// --- CLI -----------------------------------------------------------------

function readJson(path) {
  if (!path || !existsSync(path)) return undefined
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1]
  return args
}

function main(argv) {
  const [command, ...rest] = argv
  const a = parseArgs(rest)
  if (command === 'collect') {
    const image = {
      name: a['image-name'],
      id: a['image-id'],
      size: Number(a['image-size']),
      compressed: a['image-compressed'] ? Number(a['image-compressed']) : undefined,
    }
    writeFileSync(a.out, `${JSON.stringify(collect({ assetsDir: a.assets, image }), null, 2)}\n`)
    return 0
  }
  if (command === 'render') {
    const metrics = readJson(a.metrics)
    if (!metrics) {
      process.stdout.write(
        '## Summary сборки\n\nМетрики не собраны: образ не собрался или `collect` упал.\n',
      )
      return 0
    }
    process.stdout.write(
      `${render({ metrics, base: readJson(a.base), trivy: readJson(a.trivy), hadolint: readJson(a.hadolint), env: process.env })}\n`,
    )
    return 0
  }
  process.stderr.write('usage: build-summary.mjs collect|render …\n')
  return 2
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)))
