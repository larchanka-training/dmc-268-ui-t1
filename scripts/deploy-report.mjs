/**
 * Отчёт деплоя интерфейса: сторож плана OpenTofu и summary job'а `deploy`.
 *
 * Порт dmc-268-api-t1/scripts/deploy_report.py, держать в синхроне: сторож,
 * счётчики плана, диск, засечки и шаги считаются так же, ключи OpenTelemetry
 * те же — оба деплоя выглядят в summary одинаково и уйдут в коллектор без
 * переименований. Своё здесь — простой публичного входа: у контейнера
 * интерфейса нет проверки здоровья, и готовность берётся снаружи (см.
 * `downtime`). JS, а не Python: стек фронта — Node, тесты — vitest
 * (`.github/tests/deploy-report.test.mjs`).
 *
 * Две команды, только стандартная библиотека Node (на ubuntu-latest он есть):
 *
 *   tofu -chdir=infra show -json tfplan | node scripts/deploy-report.mjs plan
 *   node scripts/deploy-report.mjs render >> "$GITHUB_STEP_SUMMARY"
 *
 * `plan` читает план со stdin, пишет счётчики изменений в `plan.json` и падает,
 * если план уничтожает том ACME (спека `frontend-delivery`, «Развёртывание не
 * уничтожает том ACME»). Сам план на диск не пишется: в `tofu show -json`
 * значения переменных лежат открытым текстом, `registry_password` (токен
 * GITHUB_TOKEN) тоже.
 *
 * `render` собирает summary из того, что шаги деплоя сложили в каталог отчёта
 * (`REPORT_DIR`, по умолчанию `$RUNNER_TEMP/deploy-report`):
 *
 * - `marks` — засечки начала шагов (`.github/scripts/deploy/mark.sh`);
 * - `plan.json` — от команды `plan`;
 * - `clock`, `runner-clock` — часы сервера и раннера вокруг одного вопроса
 *   серверу; `ui-old-id`, `ui-events.jsonl`, `ui-new.json` — контейнер до apply,
 *   события Docker во время apply и состояние нового (`apply.sh`); `<файл>.error`
 *   рядом — сервер не ответил (код ssh или timeout); `ui_url` — выход tofu;
 * - `probes` — первый успешный ответ снаружи по HTTPS и `/api/v1/` через прокси
 *   (`check-site.sh`, `check-api-proxy.sh`);
 * - `disk.txt` — `df -Pk` корня и каталога Docker (`summary.sh`).
 *
 * Нет файла — нет и раздела, а не падение: summary пишется и после упавшего шага.
 * Своим значениям, которых в соглашениях нет, — пространство `dmc268.deploy.*`.
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// Тома с данными: адрес ресурса → имя тома в Docker. Замена тома — тоже
// уничтожение (delete, create). Имя ловит то, что адрес пропустит: ресурс
// переименовали без `moved`, а PROTECTED поправили под новый адрес — план
// уничтожает том по старому адресу, и prevent_destroy там уже нет.
export const PROTECTED = { 'docker_volume.acme': 'dmc268-ui-acme' }

// Действия плана (`resource_changes[].change.actions` у OpenTofu 1.13.2) — в
// колонки, как в строке `Plan:` у tofu, но замена отдельно. `no-op` и `read` —
// не изменения.
const ACTIONS = {
  create: 'add',
  update: 'change',
  delete: 'destroy',
  'delete,create': 'replace',
  'create,delete': 'replace',
  forget: 'forget',
}
const COLUMNS = ['add', 'change', 'destroy', 'replace', 'forget']
const UNCHANGED = ['no-op', 'read']

// Шаги job'а `deploy` по порядку: id, подпись, id шагов группы. Подпись —
// `name` шага в deploy.yml (сверяет .github/tests/deploy-report.test.mjs).
// Шаги с `uses` засечку не ставят, их время входит в предыдущую засечку.
export const STEPS = [
  [
    'start',
    'Подготовка: checkout, SSH, OpenTofu, туннель к хранилищу состояния',
    ['start', 'checkout', 'ssh', 'tofu', 'state'],
  ],
  ['plan', 'Спланировать и проверить план', ['plan']],
  ['apply', 'Применить конфигурацию', ['apply']],
  ['check_site', 'Проверить, что по адресу отдаётся именно наш сайт', ['check_site']],
  ['check_routes', 'Проверить маршруты', ['check_routes']],
  ['check_compression', 'Проверить сжатие статики', ['check_compression']],
  ['check_protocols', 'Проверить HTTP/2 и HTTP/3', ['check_protocols']],
  ['check_api_proxy', 'Проверить, что API доступен через тот же адрес', ['check_api_proxy']],
]
// Засечка шага summary закрывает последний шаг и весь job.
export const SUMMARY_MARK = 'summary'

// `job.status` и `steps.*.conclusion` — в значения `cicd.pipeline.task.run.result`.
const RESULTS = {
  success: 'success',
  failure: 'failure',
  cancelled: 'cancellation',
  skipped: 'skip',
}

const SIGNALS = { 3: 'SIGQUIT', 9: 'SIGKILL', 15: 'SIGTERM' }

// --- план -----------------------------------------------------------------

/** Счётчики изменений плана: тип ресурса → действие → число ресурсов. */
export function planChanges(plan) {
  const changes = {}
  for (const rc of plan.resource_changes ?? []) {
    const actions = rc.change.actions
    if (actions.length === 1 && UNCHANGED.includes(actions[0])) continue
    const action = ACTIONS[actions.join(',')] ?? actions.join('/')
    const byType = (changes[rc.type] ??= {})
    byType[action] = (byType[action] ?? 0) + 1
  }
  return changes
}

/** Защищённые тома, которые план уничтожает или заменяет: по адресу или по имени тома. */
export function protectedDeletes(plan) {
  const names = Object.values(PROTECTED)
  return (plan.resource_changes ?? [])
    .filter(
      (rc) =>
        rc.change.actions.includes('delete') &&
        (rc.address in PROTECTED ||
          (rc.type === 'docker_volume' && names.includes(rc.change.before?.name))),
    )
    .map((rc) => rc.address)
}

export function planTable(changes) {
  const used = new Set(Object.values(changes).flatMap((byType) => Object.keys(byType)))
  const columns = [...COLUMNS, ...[...used].filter((a) => !COLUMNS.includes(a)).sort()]
  return [
    `| Тип ресурса | ${columns.map((c) => `\`${c}\``).join(' | ')} |`,
    `| --- |${' ---: |'.repeat(columns.length)}`,
    ...Object.keys(changes)
      .sort()
      .map((t) => `| \`${t}\` | ${columns.map((c) => changes[t][c] ?? '').join(' | ')} |`),
  ]
}

export function planCommand(reportDir, input, log = (line) => process.stdout.write(`${line}\n`)) {
  const plan = JSON.parse(input)
  const changes = planChanges(plan)
  const deleted = protectedDeletes(plan)
  mkdirSync(reportDir, { recursive: true })
  writeFileSync(
    join(reportDir, 'plan.json'),
    JSON.stringify({ changes, protected_deletes: deleted }),
  )
  log(Object.keys(changes).length ? planTable(changes).join('\n') : 'План без изменений.')
  if (deleted.length) {
    for (const address of deleted) {
      log(
        `::error::план уничтожает том ACME ${address}: apply не запускается. ` +
          'Сменить том — новым ресурсом, а прежний снять с учёта блоком ' +
          'removed { lifecycle { destroy = false } }; сертификаты останутся на сервере.',
      )
    }
    return 1
  }
  log('Том ACME план не уничтожает.')
  return 0
}

// --- простой публичного входа --------------------------------------------

/** RFC 3339 из Docker (наносекунды, зона) в секунды эпохи; нулевое время Docker — null. */
export function parseTime(value) {
  if (!value || value.startsWith('0001-')) return null
  const m = /^(.+T\d\d:\d\d:\d\d)(\.\d+)?(Z|[+-]\d\d:\d\d)$/.exec(value)
  if (!m) return null
  return Date.parse(`${m[1]}${m[3]}`) / 1000 + Number(`0${m[2] ?? ''}`)
}

/**
 * Сдвиг часов сервера относительно раннера по одному вопросу серверу:
 * сервер ответил `server`, раннер засёк `before` и `after` вокруг вопроса.
 * Ответ пришёл где-то внутри интервала — точность половина круга.
 */
export function clockOffset(server, before, after) {
  if (![server, before, after].every(Number.isFinite)) return null
  return { offset: server - (before + after) / 2, error: (after - before) / 2 }
}

/** Строки `probes`: `<имя> <первая попытка> <последняя неуспешная|-> <ответ> <попыток>`. */
export function readProbes(text) {
  const probes = {}
  for (const line of text.split('\n')) {
    const [name, first, failed, answered, tries] = line.trim().split(/\s+/)
    if (!name || tries === undefined || name in probes) continue
    probes[name] = {
      first: Number(first),
      failed: failed === '-' ? null : Number(failed),
      answered: Number(answered),
      tries: Number(tries),
    }
  }
  return probes
}

const round = (x) => Math.round(x * 1000) / 1000
const span = (a, b) => (a != null && b != null ? round(b - a) : null)

/**
 * Разбивка простоя публичного входа при пересоздании `dmc268-ui`.
 *
 * С часов сервера (события Docker и inspect): сигнал старому (`kill`) → его
 * выход (`die`) → скачивание нового образа (`pull`, если оно пришлось на
 * простой: docker-провайдер заменяет образ между удалением старого контейнера
 * и созданием нового) → `Created` → `State.StartedAt`. Готовность — первый
 * успешный ответ HTTPS снаружи из шага проверки сайта, с часов раннера,
 * переведённых на часы сервера: проверки здоровья у контейнера нет, и сервер о
 * готовности nginx не сообщает. Опрос начинается после apply и идёт раз в 3 с,
 * поэтому готовность — верхняя граница («не позже»), а если до успешной
 * попытки были неуспешные — ещё и нижняя.
 */
export function downtime({ oldId, events, current, probes = {}, clock = null, digest = '' }) {
  if (!current) return { status: 'missing' }
  if (!oldId) return { status: 'created' }
  if (current.Id === oldId) return { status: 'kept' }

  const at = (e) => Number(e.timeNano) / 1e9
  const of = (id, action) =>
    events.find((e) => e.Type !== 'image' && e.Actor?.ID === id && e.Action === action)
  const kill = of(oldId, 'kill')
  const died = of(oldId, 'die')
  const created = parseTime(current.Created)
  const started = parseTime(current.State?.StartedAt)

  const killAt = kill ? at(kill) : null
  const diedAt = died ? at(died) : null
  // Скачивание в простое — только между выходом старого и созданием нового;
  // раньше (образ скачан до остановки) — не часть простоя.
  const pull = digest
    ? events.find(
        (e) =>
          e.Type === 'image' &&
          e.Action === 'pull' &&
          String(e.Actor?.ID ?? '').endsWith(digest) &&
          diedAt != null &&
          at(e) >= diedAt &&
          (created == null || at(e) <= created),
      )
    : undefined
  const pulledAt = pull ? at(pull) : null

  const toServer = (t) => (clock && t != null && Number.isFinite(t) ? t + clock.offset : null)
  const https = probes.https
  const httpsAt = toServer(https?.answered)
  const api = probes.api

  return {
    status: 'replaced',
    // Все сигналы старому до выхода: без destroy_grace_seconds провайдер
    // удаляет контейнер с force, и Docker шлёт SIGKILL следом за сигналом
    // остановки, не дожидаясь nginx.
    signals: events
      .filter((e) => e.Type !== 'image' && e.Actor?.ID === oldId && e.Action === 'kill')
      .filter((e) => diedAt == null || at(e) <= diedAt)
      .map((e) => SIGNALS[e.Actor?.Attributes?.signal] ?? e.Actor?.Attributes?.signal),
    stop: span(killAt, diedAt),
    pull: span(diedAt, pulledAt),
    recreate: span(pulledAt ?? diedAt, created),
    start: span(created, started),
    ready: span(started, httpsAt),
    readyAfter: https?.failed != null ? span(started, toServer(https.failed)) : null,
    firstTry: span(started, toServer(https?.first)),
    failedTries: https ? https.tries - 1 : null,
    total: span(killAt, httpsAt),
    api: span(killAt, toServer(api?.answered)),
    clockError: clock ? round(clock.error) : null,
  }
}

// --- диск -----------------------------------------------------------------

/**
 * Файловые системы из `df -Pk / <каталог Docker>`. Перед выводом df — строка
 * `docker_root <путь>`; первая строка df — корень, вторая — каталог Docker.
 */
export function disk(text) {
  let dockerRoot = ''
  const rows = []
  for (const line of text.split('\n')) {
    if (line.startsWith('docker_root ')) {
      dockerRoot = line.slice('docker_root '.length).trim()
      continue
    }
    const f = line.trim().split(/\s+/)
    if (f.length < 6 || !/^\d+$/.test(f[2]) || !/^\d+$/.test(f[3])) continue
    const used = Number(f[2]) * 1024
    const avail = Number(f[3]) * 1024
    rows.push({
      mountpoint: f.slice(5).join(' '),
      free: avail,
      utilization: used + avail ? used / (used + avail) : 0,
      what: rows.length ? [] : ['корень'],
    })
  }
  if (rows.length >= 2 && dockerRoot) {
    rows[1].what.push(`Docker (\`${dockerRoot}\`)`)
    if (rows[1].mountpoint === rows[0].mountpoint) rows[0].what.push(...rows.splice(1, 1)[0].what)
  }
  return rows.slice(0, 2)
}

export function humanBytes(n) {
  for (const unit of ['Б', 'КиБ', 'МиБ', 'ГиБ']) {
    if (n < 1024) return unit === 'Б' ? `${n.toFixed(0)} ${unit}` : `${n.toFixed(1)} ${unit}`
    n /= 1024
  }
  return `${n.toFixed(1)} ТиБ`
}

// --- шаги -----------------------------------------------------------------

/** Засечки `id время`; у повторной засечки того же шага берётся первая. */
export function readMarks(text) {
  const marks = {}
  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length !== 2 || parts[0] in marks) continue
    const t = Number(parts[1])
    if (Number.isFinite(t)) marks[parts[0]] = t
  }
  return marks
}

/** Длительность шага — до следующей по времени засечки. */
export function durations(marks) {
  const ordered = Object.entries(marks).sort((a, b) => a[1] - b[1])
  const took = {}
  for (let i = 0; i + 1 < ordered.length; i++) {
    took[ordered[i][0]] = Math.round((ordered[i + 1][1] - ordered[i][1]) * 10) / 10
  }
  return took
}

/** `STEP_RESULTS` из deploy.yml: строки `id outcome conclusion`; шаг без исхода пропускается. */
export function readStepResults(text) {
  const results = {}
  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length === 3) results[parts[0]] = { outcome: parts[1], conclusion: parts[2] }
  }
  return results
}

export function stepRows(steps, marks) {
  const took = durations(marks)
  const rows = []
  for (const [mark, label, ids] of STEPS) {
    const found = ids.filter((i) => i in steps).map((i) => steps[i])
    if (!found.length) continue
    const conclusions = new Set(found.map((s) => s.conclusion))
    let result
    if (conclusions.has('cancelled')) result = RESULTS.cancelled
    else if (conclusions.has('failure')) result = RESULTS.failure
    else if ([...conclusions].every((c) => c === 'skipped')) result = RESULTS.skipped
    else if (found.some((s) => s.outcome === 'failure')) result = 'failure, не роняет деплой'
    else result = RESULTS.success
    rows.push([label, result, took[mark] ?? null])
  }
  return rows
}

/** Первый шаг, уронивший или прервавший job: id и подпись. */
export function failedStep(steps) {
  for (const [, label, ids] of STEPS) {
    for (const i of ids) {
      if (['failure', 'cancelled'].includes(steps[i]?.conclusion)) return [i, label]
    }
  }
  return null
}

// --- summary --------------------------------------------------------------

const seconds = (v) => (v != null ? v.toFixed(1) : '—')

/** Имя, тег и digest из `<репозиторий>:<тег>@sha256:<digest>`. */
export function imageParts(image) {
  const m = /^(.+?)(?::([\w][\w.-]{0,127}))?@(sha256:[0-9a-f]{64})$/.exec(image)
  return m ? [m[1], m[2] ?? '', m[3]] : [image, '', '']
}

const read = (path) => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}
export function readEvents(text) {
  return text.split('\n').flatMap((line) => {
    try {
      return line.trim() ? [JSON.parse(line)] : []
    } catch {
      return []
    }
  })
}

export function render(reportDir, env) {
  const steps = readStepResults(env.STEP_RESULTS ?? '')
  const marks = readMarks(read(join(reportDir, 'marks')))
  const status = env.JOB_STATUS ?? ''
  const result = RESULTS[status] ?? status
  const failed = failedStep(steps)
  const runUrl = `${env.GITHUB_SERVER_URL ?? ''}/${env.GITHUB_REPOSITORY ?? ''}/actions/runs/${env.GITHUB_RUN_ID ?? ''}`
  const [name, tag, digest] = imageParts(env.IMAGE ?? '')
  const url = read(join(reportDir, 'ui_url')).trim() || (env.HOST ? `https://${env.HOST}` : '')

  let headline = { success: 'успешно', failure: 'упал', cancellation: 'отменён' }[result] ?? result
  if (failed && result !== 'success') headline += ` на шаге «${failed[1]}»`
  const out = [
    `## Деплой интерфейса: ${headline}`,
    '',
    '| | Ключ | Значение |',
    '| --- | --- | --- |',
    `| Исход | \`cicd.pipeline.task.run.result\` | \`${result}\` |`,
  ]
  if (failed && result !== 'success') {
    out.push(`| Шаг падения | \`error.type\` | \`${failed[0]}\` — ${failed[1]} |`)
  }
  out.push(
    `| Workflow | \`cicd.pipeline.name\` | ${env.GITHUB_WORKFLOW ?? ''} |`,
    `| Прогон | \`cicd.pipeline.run.id\` | [${env.GITHUB_RUN_ID ?? ''}](${runUrl}) |`,
    `| Job | \`cicd.pipeline.task.name\` | \`${env.GITHUB_JOB ?? ''}\` (\`cicd.pipeline.task.type\`: \`deploy\`) |`,
    '| Окружение | `deployment.environment.name` | `stand` |',
    `| Коммит | \`vcs.ref.head.revision\` | \`${env.SHA ?? ''}\` |`,
    `| Образ | \`container.image.name\` | \`${name}\` |`,
  )
  if (tag) out.push(`| Тег | \`container.image.tags\` | \`${tag}\` |`)
  if (digest) out.push(`| Digest | \`container.image.repo_digests\` | \`${name}@${digest}\` |`)
  if (url) out.push(`| Адрес | \`url.full\` | ${url} |`)
  if ('start' in marks && SUMMARY_MARK in marks) {
    out.push(
      `| Длительность job'а, с | \`dmc268.deploy.duration\` | ${seconds(marks[SUMMARY_MARK] - marks.start)} |`,
    )
  }
  out.push(
    '',
    ...downtimeSection(reportDir, digest),
    '',
    ...planSection(reportDir),
    '',
    ...diskSection(reportDir),
    '',
    ...stepsSection(steps, marks),
  )
  return `${out.join('\n')}\n`
}

function downtimeSection(reportDir, digest) {
  const out = ['### Простой публичного входа', '']
  if (!existsSync(join(reportDir, 'ui-old-id'))) return [...out, 'Apply не запускался.']
  for (const [file, what] of [
    ['ui-old-id', 'прежнем'],
    ['ui-new.json', 'новом'],
  ]) {
    if (existsSync(join(reportDir, `${file}.error`))) {
      const code = read(join(reportDir, `${file}.error`)).trim()
      return [
        ...out,
        `Не удалось спросить сервер о ${what} контейнере интерфейса (ssh или timeout, код ${code}): простой не посчитать.`,
      ]
    }
  }
  const [before, after] = read(join(reportDir, 'runner-clock')).trim().split(/\s+/).map(Number)
  const clock = existsSync(join(reportDir, 'clock.error'))
    ? null
    : clockOffset(Number(read(join(reportDir, 'clock')).trim() || NaN), before, after)
  const d = downtime({
    oldId: read(join(reportDir, 'ui-old-id')).trim(),
    events: readEvents(read(join(reportDir, 'ui-events.jsonl'))),
    current: readJson(join(reportDir, 'ui-new.json')),
    probes: readProbes(read(join(reportDir, 'probes'))),
    clock,
    digest,
  })
  if (d.status === 'kept') return [...out, 'Контейнер интерфейса не пересоздавался, простоя нет.']
  if (d.status === 'created') {
    return [...out, 'Интерфейс создан впервые: прежнего контейнера не было, простой не считается.']
  }
  if (d.status === 'missing')
    return [...out, 'Контейнера интерфейса после apply нет: простой не посчитать.']

  const bound = d.readyAfter != null ? 'между' : 'не позже'
  const signal = d.signals.length ? ` (${d.signals.join(' → ')})` : ''
  out.push(
    '| Этап | Ключ | с |',
    '| --- | --- | ---: |',
    `| Остановка старого: сигнал${signal} → выход процесса | \`dmc268.deploy.ui.downtime.stop\` | ${seconds(d.stop)} |`,
  )
  if (d.pull != null) {
    out.push(
      `| Удаление старого и скачивание образа: выход → \`pull\` | \`dmc268.deploy.ui.downtime.pull\` | ${seconds(d.pull)} |`,
    )
  }
  out.push(
    `| ${d.pull != null ? 'Создание нового: `pull`' : 'Удаление старого и создание нового: выход'} → \`Created\` | \`dmc268.deploy.ui.downtime.recreate\` | ${seconds(d.recreate)} |`,
    `| Старт процесса: \`Created\` → \`State.StartedAt\` | \`dmc268.deploy.ui.downtime.start\` | ${seconds(d.start)} |`,
    `| До первого ответа HTTPS снаружи (${bound}): \`StartedAt\` → ответ | \`dmc268.deploy.ui.downtime.ready\` | ${seconds(d.ready)} |`,
    `| **Простой: сигнал старому → первый ответ HTTPS снаружи** | \`dmc268.deploy.ui.downtime\` | **${seconds(d.total)}** |`,
    `| \`/api/v1/\` через прокси отвечает (не позже): сигнал старому → ответ | \`dmc268.deploy.ui.downtime.api\` | ${seconds(d.api)} |`,
    '',
  )
  const notes = [
    'Готовность — первый успешный ответ HTTPS из шага «Проверить, что по адресу отдаётся именно наш сайт»: ' +
      'проверки здоровья у контейнера нет, о готовности nginx сервер не сообщает.',
  ]
  if (d.clockError != null) {
    notes.push(
      `Время раннера переведено на часы сервера по одному вопросу серверу, точность ±${d.clockError.toFixed(3)} с.`,
    )
  } else {
    notes.push('Часы сервера не сверены: готовность и простой не посчитать.')
  }
  if (d.ready != null) {
    if (d.readyAfter != null) {
      notes.push(
        `Неуспешных попыток: ${d.failedTries}, последняя — через ${seconds(d.readyAfter)} с после \`StartedAt\`: nginx стал отвечать между ней и успешной.`,
      )
    } else {
      notes.push(
        `Опрос начинается после apply: первая же попытка (через ${seconds(d.firstTry)} с после \`StartedAt\`) успешна, раньше готовность не видна.`,
      )
    }
  } else if (d.clockError != null) {
    notes.push('Ответа HTTPS снаружи нет: шаг проверки сайта не дошёл до него.')
  }
  notes.push(
    'Ответ `/api/v1/` — из шага «Проверить, что API доступен через тот же адрес», он идёт после проверок сайта: это время, когда до него дошла очередь, а не когда прокси ожил.',
  )
  if (d.stop == null)
    notes.push('Событий остановки старого контейнера нет: начало простоя неизвестно.')
  out.push(notes.join(' '))
  return out
}

function planSection(reportDir) {
  const out = ['### План OpenTofu', '']
  const plan = readJson(join(reportDir, 'plan.json'))
  if (!plan) return [...out, 'Плана нет: шаг планирования не дошёл до него.']
  if (Object.keys(plan.changes).length) {
    out.push(
      ...planTable(plan.changes),
      '',
      'Ключ — `dmc268.deploy.plan.changes`, атрибуты `dmc268.deploy.plan.resource.type` ' +
        '(строки) и `dmc268.deploy.plan.action` (колонки). `replace` в `add` и `destroy` не входит.',
    )
  } else {
    out.push('План без изменений.')
  }
  if (plan.protected_deletes.length) {
    out.push(
      '',
      '> [!CAUTION]',
      `> Сторож тома ACME остановил деплой до apply: план уничтожает ${plan.protected_deletes.map((a) => `\`${a}\``).join(', ')} (\`dmc268.deploy.plan.protected_deletes\`).`,
    )
  } else {
    out.push(
      '',
      `Том ACME (${Object.entries(PROTECTED)
        .map(([a, n]) => `\`${a}\`, \`${n}\``)
        .join('; ')}) план не уничтожает.`,
    )
  }
  return out
}

function diskSection(reportDir) {
  const out = ['### Диск сервера', '']
  const rows = disk(read(join(reportDir, 'disk.txt')))
  if (!rows.length) return [...out, 'Свободное место не получено.']
  out.push(
    '| `system.filesystem.mountpoint` | Что на ней | Свободно (`system.filesystem.usage`, `state=free`) | Занято (`system.filesystem.utilization`) |',
    '| --- | --- | ---: | ---: |',
    ...rows.map(
      (r) =>
        `| \`${r.mountpoint}\` | ${r.what.join(', ')} | ${humanBytes(r.free)} | ${Math.round(r.utilization * 100)}% |`,
    ),
  )
  return [...out, '', 'Сервер общий с бэкендом: место занимают оба стека.']
}

function stepsSection(steps, marks) {
  return [
    '### Шаги',
    '',
    '| Шаг | `cicd.pipeline.task.run.result` | Длительность, с |',
    '| --- | --- | ---: |',
    ...stepRows(steps, marks).map(
      ([label, result, took]) => `| ${label} | \`${result}\` | ${seconds(took)} |`,
    ),
    '',
    'Длительность — до засечки следующего шага (`.github/scripts/deploy/mark.sh`): шаги с `uses` входят в предыдущий.',
  ]
}

function main(argv) {
  const reportDir =
    process.env.REPORT_DIR || join(process.env.RUNNER_TEMP || '/tmp', 'deploy-report')
  if (argv.length === 1 && argv[0] === 'plan')
    return planCommand(reportDir, readFileSync(0, 'utf8'))
  if (argv.length === 1 && argv[0] === 'render') {
    process.stdout.write(render(reportDir, process.env))
    return 0
  }
  process.stderr.write('использование: deploy-report.mjs plan|render\n')
  return 2
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.exitCode = main(process.argv.slice(2))
