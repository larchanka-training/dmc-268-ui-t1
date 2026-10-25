/**
 * Отчёт деплоя интерфейса: сторож тома ACME, разбивка простоя публичного входа
 * и summary job'а `deploy` (`scripts/deploy-report.mjs`, скрипты
 * `.github/scripts/deploy/`).
 *
 * Сторож — единственное, что стоит между планом, уничтожающим том ACME, и
 * `tofu apply`; узнавать о его поломке деплоем нельзя. Поэтому `plan.sh`,
 * `apply.sh`, `summary.sh` и проверки стенда гоняются настоящим bash с
 * подложными `tofu`, `ssh`, `timeout`, `curl` и `sleep`, а вход — настоящие
 * данные из репетиции на `docker:29-dind` (Docker 29.9.2, OpenTofu 1.13.2):
 * `plan-*.json` — урезанный до `resource_changes` вывод `tofu show -json`
 * (замена образа и плана, где блок тома удалён из конфигурации), `ui-*`,
 * `clock`, `runner-clock`, `probes` — то, что собрали `apply.sh` и проверки
 * при замене образа.
 *
 * `prevent_destroy` у тома `tofu test` не проверит (уборка `run` с
 * `command = apply` на нём упала бы), поэтому его наличие сверяется чтением
 * конфигурации. Отдельно сверяется раскладка job'а со `STEPS`: summary знает
 * шаги по id, и шаг без id, засечки или строки в `STEP_RESULTS` молча выпал бы
 * из отчёта. JS, а не TS: см. stand-ssh.test.mjs.
 */
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PROTECTED,
  STEPS,
  SUMMARY_MARK,
  clockOffset,
  disk,
  downtime,
  durations,
  parseTime,
  planChanges,
  protectedDeletes,
  readEvents,
  readMarks,
  readProbes,
} from '../../scripts/deploy-report.mjs'

const ROOT = process.cwd()
const FIXTURES = join(ROOT, '.github/tests/fixtures/deploy-report')
const SCRIPTS = join(ROOT, '.github/scripts/deploy')
const WORKFLOW = join(ROOT, '.github/workflows/deploy.yml')
const fixture = (name) => readFileSync(join(FIXTURES, name), 'utf8')

const IMAGE_B = 'e5fd7fb11a0571f2321929ebaf4821db809f7cf7ba24ee334b35801779493244'
const IMAGE = `ghcr.io/larchanka-training/dmc-268-ui-t1:0a83d25-mock@sha256:${IMAGE_B}`
const SECRET = 'ghs_секрет-реестра'

// Подложный tofu: `plan -out` создаёт файл плана, `show -json` отдаёт
// фикстуру, `apply` падает, если велит тест. Вызовы — в журнал.
const FAKE_TOFU = `#!/usr/bin/env bash
echo "tofu $*" >> "$CALLS"
case "$*" in
  *" init "*) ;;
  *" plan "*) touch infra/tfplan ;;
  *" show -json tfplan") cat "$PLAN_JSON" ;;
  *" apply "*) [ -e infra/tfplan ] || exit 3; exit "\${APPLY_EXIT:-0}" ;;
  *" output -raw ui_url") echo -n "https://203.0.113.7" ;;
esac
`

// Подложный ssh: отвечает на команды apply.sh и summary.sh из файлов фикстур.
// SSH_FAIL — подстрока команды, на которой ssh падает, как при обрыве (255).
const FAKE_SSH = `#!/usr/bin/env bash
while [ $# -gt 0 ]; do case "$1" in -o) shift 2 ;; -*) shift ;; *) break ;; esac; done
shift
echo "ssh $*" >> "$CALLS"
if [ -n "\${SSH_FAIL:-}" ] && [[ "$*" == *"$SSH_FAIL"* ]]; then exit 255; fi
case "$*" in
  "date +%s.%N") cat "$FIX/clock" ;;
  *"docker events"*) cat "$FIX/ui-events.jsonl"; exec sleep 30 ;;
  *"docker inspect -f '{{.Id}}'"*) cat "$FIX/\${OLD_ID:-ui-old-id}" ;;
  *"docker inspect -f"*) cat "$FIX/ui-new.json" ;;
  *"docker info"*) printf 'docker_root /var/lib/docker\\n%s\\n' "$DF" ;;
esac
`

// coreutils timeout на macOS нет: подложный пишет вызов и запускает команду.
const FAKE_TIMEOUT = `#!/usr/bin/env bash
echo "timeout $*" >> "$CALLS"
shift
exec "$@"
`

// Подложный curl для проверок стенда: CURL_FAILS первых запросов к телу
// страницы не отвечают, дальше — лендинг или JSON API.
const FAKE_CURL = `#!/usr/bin/env bash
echo "curl $*" >> "$CALLS"
case "$*" in
  *redirect_url*) printf 'https://%s/' "$HOST"; exit 0 ;;
  *" -D "*) printf 'HTTP/2 200\\r\\nstrict-transport-security: max-age=86400\\r\\n'; exit 0 ;;
esac
n=$(cat "$CALLS.curl" 2>/dev/null || echo 0)
echo $((n + 1)) > "$CALLS.curl"
[ "$n" -lt "\${CURL_FAILS:-0}" ] && exit 7
case "$*" in
  */api/v1/*) echo '{"detail":"Not Found"}' ;;
  *) echo '<title>DMC-268</title>' ;;
esac
`

const GNU_DF = `Filesystem     1024-blocks     Used Available Capacity Mounted on
/dev/vda1         81106868 30553012  50537472      38% /
/dev/vda1         81106868 30553012  50537472      38% /`

const ALL_SUCCESS = STEPS.flatMap(([, , ids]) => ids.map((i) => `${i} success success`)).join('\n')

const dirs = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

/** Каталог прогона: копия скрипта отчёта, infra/, подложные команды. */
function sandbox() {
  const tmp = mkdtempSync(join(tmpdir(), 'deploy-report-'))
  dirs.push(tmp)
  const root = join(tmp, 'repo')
  mkdirSync(join(root, 'infra'), { recursive: true })
  mkdirSync(join(root, 'scripts'))
  writeFileSync(
    join(root, 'scripts/deploy-report.mjs'),
    readFileSync(join(ROOT, 'scripts/deploy-report.mjs')),
  )
  const bin = join(tmp, 'bin')
  mkdirSync(bin)
  const fakes = {
    tofu: FAKE_TOFU,
    ssh: FAKE_SSH,
    timeout: FAKE_TIMEOUT,
    curl: FAKE_CURL,
    sleep: '#!/bin/sh\n',
  }
  for (const [name, body] of Object.entries(fakes)) {
    writeFileSync(join(bin, name), body)
    chmodSync(join(bin, name), 0o755)
  }
  return { tmp, root, bin, report: join(tmp, 'report'), calls: join(tmp, 'calls') }
}

function run(box, script, { args = [], plan = 'plan-replace-ui.json', ...env } = {}) {
  const result = spawnSync('bash', [join(SCRIPTS, script), ...args], {
    cwd: box.root,
    encoding: 'utf8',
    env: {
      // sleep из PATH раннера не нужен: подложный не ждёт, а настоящий
      // ssh-поток событий подложный ssh держит своим `exec sleep 30`.
      PATH: `${box.bin}:${process.env.PATH}`,
      REPORT_DIR: box.report,
      CALLS: box.calls,
      PLAN_JSON: plan.startsWith('/') ? plan : join(FIXTURES, plan),
      FIX: FIXTURES,
      DF: GNU_DF,
      HOST: '203.0.113.7',
      ...env,
    },
  })
  return result
}

const calls = (box) => (existsSync(box.calls) ? readFileSync(box.calls, 'utf8') : '')
const reportFile = (box, name) => readFileSync(join(box.report, name), 'utf8')

function summary(box, env = {}) {
  const out = join(box.tmp, 'summary.md')
  const result = run(box, 'summary.sh', {
    GITHUB_STEP_SUMMARY: out,
    IMAGE,
    JOB_STATUS: 'success',
    STEP_RESULTS: ALL_SUCCESS,
    ...env,
  })
  expect(result.status, result.stderr).toBe(0)
  return readFileSync(out, 'utf8')
}

/** Полный успешный выкат: план, apply, проверки сайта и API. */
function deploy(box, env = {}) {
  for (const [script, args] of [
    ['plan.sh', []],
    ['apply.sh', []],
    ['check-site.sh', []],
    ['check-api-proxy.sh', ['https://203.0.113.7']],
  ]) {
    const result = run(box, script, { args, ...env })
    expect(result.status, `${script}: ${result.stdout}${result.stderr}`).toBe(0)
  }
}

// --- сторож и план ----------------------------------------------------------

describe('сторож тома ACME', () => {
  it('пропускает план, который том не трогает, и оставляет план для apply', () => {
    const box = sandbox()
    const result = run(box, 'plan.sh')

    expect(result.status, result.stdout + result.stderr).toBe(0)
    expect(result.stdout).toContain('Том ACME план не уничтожает.')
    expect(JSON.parse(reportFile(box, 'plan.json'))).toEqual({
      changes: { docker_container: { replace: 1 }, docker_image: { replace: 1 } },
      protected_deletes: [],
    })
    expect(existsSync(join(box.root, 'infra/tfplan'))).toBe(true)
    const log = calls(box)
    expect(log).toContain('tofu -chdir=infra init -input=false -no-color')
    expect(log).toContain('-chdir=infra plan -input=false -no-color -lock-timeout=2m -out=tfplan')
  })

  it('останавливает план, удаляющий том, до apply и убирает файл плана', () => {
    const box = sandbox()
    const result = run(box, 'plan.sh', { plan: 'plan-delete-acme.json' })

    expect(result.status).not.toBe(0)
    expect(result.stdout).toContain('::error::план уничтожает том ACME docker_volume.acme')
    expect(JSON.parse(reportFile(box, 'plan.json')).protected_deletes).toEqual([
      'docker_volume.acme',
    ])
    expect(existsSync(join(box.root, 'infra/tfplan'))).toBe(false)
    expect(calls(box)).not.toContain(' apply ')
  })

  it('видит том по имени, если адрес ресурса сменили без moved', () => {
    const plan = {
      resource_changes: [
        {
          address: 'docker_volume.certs',
          type: 'docker_volume',
          change: { actions: ['delete'], before: { name: 'dmc268-ui-acme' } },
        },
        {
          address: 'docker_volume.scratch',
          type: 'docker_volume',
          change: { actions: ['delete'], before: { name: 'scratch' } },
        },
        {
          address: 'docker_volume.acme',
          type: 'docker_volume',
          change: { actions: ['no-op'], before: { name: 'dmc268-ui-acme' } },
        },
      ],
    }
    expect(protectedDeletes(plan)).toEqual(['docker_volume.certs'])
    expect(planChanges(plan)).toEqual({ docker_volume: { destroy: 2 } })
  })

  it('замена тома — тоже уничтожение; снятие с учёта (forget) — нет', () => {
    const volume = (actions) => ({
      resource_changes: [
        { address: 'docker_volume.acme', type: 'docker_volume', change: { actions } },
      ],
    })
    expect(protectedDeletes(volume(['delete', 'create']))).toEqual(['docker_volume.acme'])
    expect(protectedDeletes(volume(['create', 'delete']))).toEqual(['docker_volume.acme'])
    expect(protectedDeletes(volume(['forget']))).toEqual([])
  })

  it('в отчёт не попадают значения переменных плана: там токен реестра', () => {
    const box = sandbox()
    const plan = JSON.parse(fixture('plan-replace-ui.json'))
    plan.variables = { registry_password: { value: SECRET } }
    const planPath = join(box.tmp, 'plan-with-variables.json')
    writeFileSync(planPath, JSON.stringify(plan))

    const result = run(box, 'plan.sh', { plan: planPath })

    expect(result.status).toBe(0)
    expect(result.stdout).not.toContain(SECRET)
    for (const name of readdirSync(box.report)) {
      expect(reportFile(box, name), name).not.toContain(SECRET)
    }
  })
})

/** Ресурсы docker_volume из infra/*.tf: адрес → тело блока. */
function volumeBlocks() {
  const infra = join(ROOT, 'infra')
  const text = readdirSync(infra)
    .filter((f) => f.endsWith('.tf'))
    .map((f) => readFileSync(join(infra, f), 'utf8'))
    .join('\n')
  return Object.fromEntries(
    [...text.matchAll(/^resource\s+"docker_volume"\s+"(\w+)"\s*\{\n([\s\S]*?)^\}/gm)].map((m) => [
      `docker_volume.${m[1]}`,
      m[2],
    ]),
  )
}

describe('тома в конфигурации', () => {
  it('каждый том стека — под сторожем, с тем же именем: новый том без правки сторожа — дыра', () => {
    const blocks = volumeBlocks()
    expect(Object.keys(blocks).length, 'ресурсы docker_volume не найдены в infra/*.tf').toBe(1)
    expect(Object.keys(blocks).sort()).toEqual(Object.keys(PROTECTED).sort())
    for (const [address, body] of Object.entries(blocks)) {
      expect(/^\s*name\s*=\s*"([^"]+)"/m.exec(body)?.[1], address).toBe(PROTECTED[address])
    }
  })

  it('у каждого тома prevent_destroy: он держит и ручной tofu apply и destroy мимо сторожа', () => {
    for (const [address, body] of Object.entries(volumeBlocks())) {
      expect(body, `у ${address} нет lifecycle { prevent_destroy = true }`).toMatch(
        /^\s*lifecycle\s*\{[^}]*^\s*prevent_destroy\s*=\s*true\s*$/m,
      )
    }
  })
})

// --- apply и простой ----------------------------------------------------------

describe('apply.sh', () => {
  it('применяет сохранённый план и собирает контейнер, события и часы сервера', () => {
    const box = sandbox()
    run(box, 'plan.sh')
    const result = run(box, 'apply.sh')

    expect(result.status, result.stdout + result.stderr).toBe(0)
    const log = calls(box)
    expect(log).toContain('-chdir=infra apply -input=false -no-color -lock-timeout=2m tfplan')
    expect(reportFile(box, 'ui-old-id')).toBe(fixture('ui-old-id'))
    expect(JSON.parse(reportFile(box, 'ui-new.json')).Id).toMatch(/^58ea3b71/)
    expect(reportFile(box, 'ui-events.jsonl')).toContain('"Action":"pull"')
    expect(reportFile(box, 'clock')).toBe(fixture('clock'))
    expect(reportFile(box, 'runner-clock').trim().split(' ')).toHaveLength(2)
    expect(reportFile(box, 'ui_url')).toBe('https://203.0.113.7')
    expect(existsSync(join(box.root, 'infra/tfplan'))).toBe(false)
    // Поток событий — по событиям, а не по контейнеру: иначе pull образа не увидеть.
    expect(log).toMatch(/docker events --since \d+ --filter type=container --filter type=image/)
    expect(log).toContain('--filter event=pull')
  })

  it('сохраняет код tofu apply и всё равно собирает сырьё и убирает план', () => {
    const box = sandbox()
    run(box, 'plan.sh')
    const result = run(box, 'apply.sh', { APPLY_EXIT: '1' })

    expect(result.status).toBe(1)
    expect(existsSync(join(box.report, 'ui-new.json'))).toBe(true)
    expect(existsSync(join(box.root, 'infra/tfplan'))).toBe(false)
  })

  it('спрашивает сервер под timeout и берёт из inspect только Id, Created и State', () => {
    const box = sandbox()
    run(box, 'plan.sh')
    run(box, 'apply.sh')

    expect(calls(box).match(/timeout 30 ssh stand /g)).toHaveLength(3)
    const script = readFileSync(join(SCRIPTS, 'apply.sh'), 'utf8')
    const inspects = [...script.matchAll(/^\s*ask \S+ "docker inspect[^\n]*/gm)].map((m) => m[0])
    expect(inspects).toHaveLength(2)
    for (const call of inspects) expect(call).toContain(' -f ')
  })

  it('отличает упавший ssh от первого выката', () => {
    const failed = sandbox()
    run(failed, 'plan.sh')
    expect(run(failed, 'apply.sh', { SSH_FAIL: '{{.Id}}' }).status).toBe(0)
    expect(reportFile(failed, 'ui-old-id.error').trim()).toBe('255')
    const text = summary(failed)
    expect(text).toContain(
      'Не удалось спросить сервер о прежнем контейнере интерфейса (ssh или timeout, код 255)',
    )
    expect(text).not.toContain('создан впервые')

    // Нет файла — подложный ssh отвечает пусто с кодом 1, как `docker inspect` без контейнера.
    const first = sandbox()
    run(first, 'plan.sh')
    expect(run(first, 'apply.sh', { OLD_ID: 'absent' }).status).toBe(0)
    expect(existsSync(join(first.report, 'ui-old-id.error'))).toBe(false)
    expect(summary(first)).toContain('Интерфейс создан впервые: прежнего контейнера не было')
  })
})

const OLD_ID = fixture('ui-old-id').trim()
const NEW = JSON.parse(fixture('ui-new.json'))
const EVENTS = readEvents(fixture('ui-events.jsonl'))
const [BEFORE, AFTER] = fixture('runner-clock').trim().split(' ').map(Number)
const CLOCK = clockOffset(Number(fixture('clock')), BEFORE, AFTER)

const breakdown = (changes = {}) =>
  downtime({
    oldId: OLD_ID,
    events: EVENTS,
    current: NEW,
    probes: readProbes(fixture('probes')),
    clock: CLOCK,
    digest: `sha256:${IMAGE_B}`,
    ...changes,
  })

describe('простой публичного входа', () => {
  it('разбивка по событиям Docker из репетиции: этапы складываются в простой', () => {
    const d = breakdown()

    expect(d.status).toBe('replaced')
    // Без destroy_grace_seconds провайдер удаляет с force: SIGKILL вслед за SIGQUIT.
    expect(d.signals).toEqual(['SIGQUIT', 'SIGKILL'])
    expect(d.stop).toBeCloseTo(0.133, 2)
    expect(d.pull).toBeCloseTo(0.084, 2)
    expect(d.recreate).toBeCloseTo(0.105, 2)
    expect(d.start).toBeCloseTo(0.033, 2)
    expect(d.ready).toBeCloseTo(0.16, 2)
    expect(d.total).toBeCloseTo(0.515, 2)
    expect(d.stop + d.pull + d.recreate + d.start + d.ready).toBeCloseTo(d.total, 2)
    expect(d.failedTries).toBe(0)
    expect(d.readyAfter).toBeNull()
  })

  it('время раннера переводится на часы сервера', () => {
    // Часы сервера на 100 с впереди: события и inspect сдвигаются, ответы снаружи — нет.
    const shift = (t) => new Date(Date.parse(t) + 100_000).toISOString()
    const nano = (e) => ({ ...e, timeNano: String(BigInt(e.timeNano) + 100_000_000_000n) })
    const d = breakdown({
      events: EVENTS.map(nano),
      current: {
        ...NEW,
        Created: shift(NEW.Created),
        State: { ...NEW.State, StartedAt: shift(NEW.State.StartedAt) },
      },
      clock: clockOffset(Number(fixture('clock')) + 100, BEFORE, AFTER),
    })
    expect(d.total).toBeCloseTo(breakdown().total, 2)
    expect(d.ready).toBeCloseTo(breakdown().ready, 2)
  })

  it('скачивание образа до остановки старого — не часть простоя', () => {
    const died = EVENTS.find((e) => e.Action === 'die')
    const events = EVENTS.map((e) =>
      e.Action === 'pull' && e.Actor.ID.endsWith(IMAGE_B)
        ? { ...e, timeNano: String(BigInt(died.timeNano) - 5_000_000_000n) }
        : e,
    )
    const d = breakdown({ events })
    expect(d.pull).toBeNull()
    expect(d.recreate).toBeCloseTo(0.189, 2)
    // Ранний pull прежнего образа в том же потоке (первый выкат) не путается с новым.
    expect(breakdown({ digest: 'sha256:b10338c7' }).pull).toBeNull()
  })

  it('неуспешные попытки до ответа дают нижнюю границу готовности', () => {
    const [https] = fixture('probes').split('\n')
    const [, , , answered] = https.split(' ')
    const probes = readProbes(
      `https ${Number(answered) - 6.2} ${Number(answered) - 3.1} ${answered} 3\n`,
    )
    const d = breakdown({ probes })
    expect(d.failedTries).toBe(2)
    expect(d.readyAfter).toBeCloseTo(d.ready - 3.1, 1)
  })

  it('без ответа снаружи или без сверки часов готовность не выдумывается', () => {
    expect(breakdown({ probes: {} })).toMatchObject({ ready: null, total: null, api: null })
    expect(breakdown({ clock: null })).toMatchObject({ ready: null, total: null })
    expect(breakdown({ clock: null }).stop).toBeCloseTo(0.133, 2)
  })

  it('не пересоздавался, создан впервые, контейнера нет', () => {
    expect(downtime({ oldId: NEW.Id, events: [], current: NEW })).toEqual({ status: 'kept' })
    expect(downtime({ oldId: '', events: [], current: NEW })).toEqual({ status: 'created' })
    expect(downtime({ oldId: 'abc', events: [], current: null })).toEqual({ status: 'missing' })
  })

  it('время Docker — с наносекундами и зоной демона; нулевое время — не время', () => {
    expect(parseTime('2026-10-25T14:40:33.125921014+03:00')).toBeCloseTo(
      parseTime('2026-10-25T11:40:33.125921014Z'),
      6,
    )
    expect(parseTime('2026-10-25T11:40:33.125921014Z') % 1).toBeCloseTo(0.125921, 5)
    expect(parseTime('0001-01-01T00:00:00Z')).toBeNull()
  })
})

// --- проверки стенда пишут ответы для отчёта ------------------------------------

describe('проверки стенда', () => {
  it('check-site.sh записывает первую попытку, последнюю неуспешную и ответ', () => {
    const box = sandbox()
    const result = run(box, 'check-site.sh', { CURL_FAILS: '2' })

    expect(result.status, result.stdout + result.stderr).toBe(0)
    const { https } = readProbes(reportFile(box, 'probes'))
    expect(https.tries).toBe(3)
    expect(https.failed).toBeGreaterThanOrEqual(https.first)
    expect(https.answered).toBeGreaterThanOrEqual(https.failed)
  })

  it('check-api-proxy.sh записывает ответ API', () => {
    const box = sandbox()
    expect(run(box, 'check-api-proxy.sh', { args: ['https://203.0.113.7'] }).status).toBe(0)
    expect(readProbes(reportFile(box, 'probes')).api).toMatchObject({ failed: null, tries: 1 })
  })
})

// --- диск, засечки ------------------------------------------------------------

describe('диск и засечки', () => {
  it('корень и Docker на одной файловой системе — одна строка', () => {
    expect(disk(`docker_root /var/lib/docker\n${GNU_DF}`)).toEqual([
      {
        mountpoint: '/',
        free: 50537472 * 1024,
        utilization: 30553012 / (30553012 + 50537472),
        what: ['корень', 'Docker (`/var/lib/docker`)'],
      },
    ])
  })

  it('Docker на отдельном разделе — две строки', () => {
    const rows = disk(
      'docker_root /srv/docker\nFilesystem 1024-blocks Used Available Capacity Mounted on\n' +
        '/dev/vda1 100 60 40 60% /\n/dev/vdb1 1000 100 900 10% /srv\n',
    )
    expect(rows.map((r) => [r.mountpoint, r.what])).toEqual([
      ['/', ['корень']],
      ['/srv', ['Docker (`/srv/docker`)']],
    ])
  })

  it('длительность шага — до следующей засечки; mark.sh пишет засечку', () => {
    const box = sandbox()
    for (const step of ['start', 'plan']) {
      spawnSync('bash', [join(SCRIPTS, 'mark.sh')], {
        env: { PATH: process.env.PATH, REPORT_DIR: box.report, GITHUB_ACTION: step },
      })
    }
    expect(Object.keys(readMarks(reportFile(box, 'marks')))).toEqual(['start', 'plan'])
    expect(durations({ start: 10, plan: 12.5, summary: 20 })).toEqual({ start: 2.5, plan: 7.5 })
  })
})

// --- summary -------------------------------------------------------------------

describe('summary', () => {
  it('успешный выкат: исход, простой, план, диск, шаги', () => {
    const box = sandbox()
    deploy(box)
    // Часы и ответы снаружи — из той же репетиции, что события и inspect:
    // подложные проверки отвечают сейчас, а события фикстуры — в прошлом.
    for (const name of ['clock', 'runner-clock', 'probes']) {
      writeFileSync(join(box.report, name), fixture(name))
    }
    writeFileSync(
      join(box.report, 'marks'),
      'start 100\nplan 110\napply 118\ncheck_site 125\nsummary 160\n',
    )

    const text = summary(box)

    expect(text.startsWith('## Деплой интерфейса: успешно\n')).toBe(true)
    expect(text).toContain('| Остановка старого: сигнал (SIGQUIT → SIGKILL) → выход процесса |')
    expect(text).toContain(
      '| Удаление старого и скачивание образа: выход → `pull` | `dmc268.deploy.ui.downtime.pull` | 0.1 |',
    )
    expect(text).toContain(
      '| **Простой: сигнал старому → первый ответ HTTPS снаружи** | `dmc268.deploy.ui.downtime` | **0.5** |',
    )
    expect(text).toContain('точность ±0.003 с')
    expect(text).toContain('`/api/v1/` через прокси отвечает (не позже)')
    expect(text).toContain('проверки здоровья у контейнера нет')
    expect(text).toContain('| `docker_container` |  |  |  | 1 |  |')
    expect(text).toContain('Том ACME (`docker_volume.acme`, `dmc268-ui-acme`) план не уничтожает.')
    expect(text).toContain('| `/` | корень, Docker (`/var/lib/docker`) | 48.2 ГиБ | 38% |')
    expect(text).toContain('| Применить конфигурацию | `success` | 7.0 |')
    expect(text).toContain("| Длительность job'а, с | `dmc268.deploy.duration` | 60.0 |")
    expect(text).toContain('`container.image.tags` | `0a83d25-mock`')
    expect(text).toContain('| Адрес | `url.full` | https://203.0.113.7 |')
    expect(text).not.toContain(SECRET)
  })

  it('называет упавший шаг и без отчёта', () => {
    const box = sandbox()
    const results = ALL_SUCCESS.replace('plan success success', 'plan failure failure').replace(
      /^(apply|check_\w+) success success$/gm,
      '$1 skipped skipped',
    )

    const text = summary(box, { JOB_STATUS: 'failure', STEP_RESULTS: results })

    expect(
      text.startsWith('## Деплой интерфейса: упал на шаге «Спланировать и проверить план»\n'),
    ).toBe(true)
    expect(text).toContain(
      '| Шаг падения | `error.type` | `plan` — Спланировать и проверить план |',
    )
    expect(text).toContain('Apply не запускался.')
    expect(text).toContain('| Применить конфигурацию | `skip` | — |')
  })

  it('сторож в summary: план с удалением тома', () => {
    const box = sandbox()
    run(box, 'plan.sh', { plan: 'plan-delete-acme.json' })
    const text = summary(box, { JOB_STATUS: 'failure' })
    expect(text).toContain(
      '> Сторож тома ACME остановил деплой до apply: план уничтожает `docker_volume.acme`',
    )
  })

  it('убирает файл плана, оставшийся от оборванного job, и спрашивает диск под timeout', () => {
    const box = sandbox()
    run(box, 'plan.sh')
    expect(existsSync(join(box.root, 'infra/tfplan'))).toBe(true)

    summary(box, { JOB_STATUS: 'cancelled' })

    expect(existsSync(join(box.root, 'infra/tfplan'))).toBe(false)
    expect(calls(box)).toContain('timeout 30 ssh -o ConnectTimeout=10 stand')
  })
})

// --- раскладка job'а -----------------------------------------------------------

/**
 * Шаги job'а `deploy` из deploy.yml: id, name, uses, if, первая строка run,
 * timeout-minutes, with.tofu_wrapper и строки STEP_RESULTS. YAML-парсера в
 * зависимостях нет, а раскладка job'а простая: шаг — `      - `, ключ шага —
 * восемь пробелов.
 */
function deploySteps() {
  const text = readFileSync(WORKFLOW, 'utf8')
  const job = text.slice(text.indexOf('\n  deploy:\n'))
  const body = job.slice(job.indexOf('\n    steps:\n') + '\n    steps:\n'.length)
  return body
    .split(/^ {6}- /m)
    .slice(1)
    .map((raw) => {
      const step = `        ${raw}`
      const key = (name) => new RegExp(`^ {8}${name}: (.+)$`, 'm').exec(step)?.[1]
      const run = key('run')
      const results = /^ {10}STEP_RESULTS: \|\n((?: {12}.+\n)+)/m.exec(step)
      return {
        id: key('id'),
        name: key('name'),
        uses: key('uses'),
        if: key('if'),
        timeout: key('timeout-minutes'),
        wrapper: /^ {10}tofu_wrapper: (\S+)$/m.exec(step)?.[1],
        run: run === '|' ? /^ {8}run: \|\n {10}(.+)$/m.exec(step)?.[1] : run,
        stepResults: results
          ? results[1]
              .trimEnd()
              .split('\n')
              .map((l) => l.trim())
          : [],
      }
    })
}

describe('раскладка job deploy', () => {
  it('каждый шаг известен summary: порядок, id и строка в STEP_RESULTS', () => {
    const steps = deploySteps()
    const last = steps.at(-1)
    expect(last.id).toBe(SUMMARY_MARK)
    expect(last.if).toBe('always()')
    expect(last.timeout).toBe('3')

    const ids = steps.slice(0, -1).map((s) => s.id)
    expect(ids, 'шаг без id не попадёт в summary').not.toContain(undefined)
    expect(ids, 'порядок и состав шагов в deploy.yml и STEPS разошлись').toEqual(
      STEPS.flatMap(([, , group]) => group),
    )
    expect(last.stepResults).toEqual(
      ids.map((i) => `${i} \${{ steps.${i}.outcome }} \${{ steps.${i}.conclusion }}`),
    )
  })

  it('подписи summary — имена шагов', () => {
    const names = Object.fromEntries(deploySteps().map((s) => [s.id, s.name]))
    for (const [mark, label, group] of STEPS) {
      if (group.length === 1) expect(names[mark], `подпись шага ${mark}`).toBe(label)
    }
  })

  it('каждый шаг с run первой строкой ставит засечку', () => {
    for (const step of deploySteps()) {
      if (step.run === undefined || step.id === 'start') continue
      expect(step.run, `шаг ${step.id}`).toBe('.github/scripts/deploy/mark.sh')
    }
  })

  it('tofu без обёртки: она кладёт stdout tofu, с токеном реестра в JSON плана, в выходы шага', () => {
    const setup = deploySteps().find((s) => s.uses?.startsWith('opentofu/setup-opentofu@'))
    expect(setup.wrapper).toBe('false')
  })
})
