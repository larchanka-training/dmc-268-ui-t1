/**
 * SSH к стенду в деплое: одно соединение на все вызовы и туннели мимо него.
 *
 * `.github/actions/stand-ssh` (копия из dmc-268-api-t1, там тот же тест —
 * tests/test_stand_ssh.py) пишет хост `stand` с ControlMaster: через фоновое
 * соединение идут `ssh stand …` и запросы docker-провайдера к `ssh://stand`.
 * Туннель через master ведёт себя иначе: проброс открывает сам master,
 * `ExitOnForwardFailure` на занятом порте не срабатывает, а туннель
 * закрывается вместе с master по ControlPersist простоя. Поэтому каждый
 * `ssh -L` в `.github/` и `scripts/` обязан идти своим соединением —
 * `-o ControlPath=none`. Новый туннель без него молча потерял бы проверку
 * проброса; ловим здесь, а не деплоем.
 *
 * Скрипты actions гоняются настоящим bash с подложным HOME: так проверяется и
 * текст внутри YAML, и то, что конфиг вообще пишется.
 *
 * JS, а не TS: tsconfig собирает только src/ под браузер, типов Node в проекте
 * нет, а тесту нужны child_process и fs.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, relative } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'

// Корень репозитория — рабочий каталог vitest: в окружении jsdom import.meta.url
// не file://.
const ROOT = process.cwd()
const STAND_SSH = join(ROOT, '.github/actions/stand-ssh/action.yml')
const STATE_TUNNEL = join(ROOT, '.github/actions/state-tunnel/action.yml')
const SCANNED_DIRS = ['.github', 'scripts']
const HOST = '203.0.113.7'

// sun_path unix-сокета — 104 байта на macOS, 108 на Linux, с завершающим нулём.
const SOCKET_PATH_LIMIT = 103
const RUNNER_HOME = '/home/runner'
// %C — SHA1 в hex; пока master поднимается, ssh держит сокет под временным
// именем с суффиксом из точки и 16 символов.
const CONTROL_HASH_LEN = 40
const TEMP_SUFFIX_LEN = 17

/** Тексты блоков `run: |` из YAML: строки глубже ключа, без общего отступа. */
function runBlocks(yamlText) {
  const lines = yamlText.split('\n')
  const blocks = []
  lines.forEach((line, i) => {
    const key = /^(\s*)(?:- )?run: \|\s*$/.exec(line)
    if (!key) return
    const body = []
    for (const next of lines.slice(i + 1)) {
      if (next.trim() !== '' && next.search(/\S/) <= key[1].length) break
      body.push(next)
    }
    const indent = Math.min(...body.filter((l) => l.trim()).map((l) => l.search(/\S/)))
    blocks.push(body.map((l) => l.slice(indent)).join('\n'))
  })
  return blocks
}

/** Опции блока `Host <host>` из ssh_config: ключи в нижнем регистре. */
function hostOptions(config, host) {
  const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const block = new RegExp(`^Host ${escaped}\\n((?:[ \\t]+\\S.*\\n?)*)`, 'm').exec(config)
  if (!block) return {}
  return Object.fromEntries(
    block[1]
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => {
        const [key, ...value] = l.trim().split(/\s+/)
        return [key.toLowerCase(), value.join(' ')]
      }),
  )
}

/** Длина пути сокета на раннере: ~ — домашний каталог, %C — хеш, плюс временный суффикс. */
function expandedSocketLength(controlPath, home) {
  const path = controlPath.replace('~', home).replace('%C', 'x'.repeat(CONTROL_HASH_LEN))
  return path.length + TEMP_SUFFIX_LEN
}

/** Вызовы `ssh … -L …`, которые пошли бы через ControlMaster. */
function tunnelsWithoutOwnConnection(text) {
  const commands = [...text.matchAll(/^[ \t]*(?:- )?(?:run: )?(ssh\b[^\n]*\s-L\s[^\n]*)$/gm)]
  return commands.map((m) => m[1]).filter((c) => !/-o\s*ControlPath=none\b/.test(c))
}

function filesUnder(dir) {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && ['.sh', '.yml', '.yaml'].includes(extname(e.name)))
    .map((e) => join(e.parentPath, e.name))
}

const temps = []
function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'stand-ssh-'))
  temps.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** Прогнать скрипт stand-ssh с подложным HOME и закреплённым ключом хоста; вернуть ~/.ssh/config. */
function runStandSsh() {
  const tmp = tempDir()
  const workspace = join(tmp, 'workspace')
  mkdirSync(join(workspace, '.github/ssh'), { recursive: true })
  const key = join(tmp, 'host_key')
  execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', key])
  const hostKey = readFileSync(`${key}.pub`, 'utf8').split(/\s+/).slice(0, 2).join(' ')
  writeFileSync(join(workspace, '.github/ssh/known_hosts'), `${HOST} ${hostKey}\n`)

  const home = join(tmp, 'home')
  mkdirSync(home)
  const [script] = runBlocks(readFileSync(STAND_SSH, 'utf8'))
  execFileSync('bash', ['-c', script], {
    env: {
      PATH: process.env.PATH,
      HOME: home,
      GITHUB_WORKSPACE: workspace,
      CI_KEY: 'ключ',
      SSH_USER: 'deploy',
      HOST,
    },
  })
  return readFileSync(join(home, '.ssh/config'), 'utf8')
}

describe('извлечение фактов', () => {
  it('находит то, что есть: шаблон, переставший находить факт, падает здесь, а не молчит', () => {
    expect(runBlocks('steps:\n  - run: |\n      echo 1\n\n      echo 2\n  - run: x\n')).toEqual([
      'echo 1\n\necho 2',
    ])
    const config = 'Host stand\n  HostName 1.2.3.4\n  ControlMaster auto\n\nHost other\n  User x\n'
    expect(hostOptions(config, 'stand')).toEqual({ hostname: '1.2.3.4', controlmaster: 'auto' })
    expect(expandedSocketLength('~/.ssh/cm-%C', RUNNER_HOME)).toBe(
      `${RUNNER_HOME}/.ssh/cm-`.length + CONTROL_HASH_LEN + TEMP_SUFFIX_LEN,
    )
    expect(
      tunnelsWithoutOwnConnection(
        '  ssh -o ExitOnForwardFailure=yes -f -N -L "9000:127.0.0.1:9000" stand\n' +
          '      - run: ssh -f -N -L 1:127.0.0.1:1 stand\n',
      ),
    ).toEqual([
      'ssh -o ExitOnForwardFailure=yes -f -N -L "9000:127.0.0.1:9000" stand',
      'ssh -f -N -L 1:127.0.0.1:1 stand',
    ])
  })

  it('сообщает об отсутствии, а не возвращает пустое значение за находку', () => {
    expect(hostOptions('Host other\n  User x\n', 'stand')).toEqual({})
    expect(
      tunnelsWithoutOwnConnection(
        'ssh -o ControlPath=none -o ExitOnForwardFailure=yes -f -N -L 1:127.0.0.1:1 stand\n',
      ),
    ).toEqual([])
    // Не туннель и не команда: обычный вызов и комментарий про -L.
    expect(
      tunnelsWithoutOwnConnection('ssh stand "docker ps"\n# туннели (`ssh -f -N -L`)\n'),
    ).toEqual([])
  })
})

describe('stand-ssh', () => {
  it('у action один шаг со скриптом', () => {
    const blocks = runBlocks(readFileSync(STAND_SSH, 'utf8'))
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toContain('~/.ssh/config')
  })

  it('хост stand ходит через одно соединение', () => {
    const options = hostOptions(runStandSsh(), 'stand')
    expect(options.hostname, 'нет хоста stand с адресом сервера').toBe(HOST)
    expect(options.user).toBe('deploy')
    expect(options.controlmaster, 'у хоста stand нет ControlMaster auto').toBe('auto')
    expect(
      options.controlpersist,
      'у хоста stand нет ControlPersist: master закрывался бы с первым вызовом',
    ).toBeTruthy()
    const controlPath = options.controlpath ?? ''
    expect(controlPath, 'ControlPath без %C').toContain('%C')
    expect(
      expandedSocketLength(controlPath, RUNNER_HOME),
      `ControlPath ${controlPath} на раннере длиннее предела сокета`,
    ).toBeLessThanOrEqual(SOCKET_PATH_LIMIT)
  })
})

describe('туннели', () => {
  it('каждый ssh -L открывает своё соединение: через master не ловится занятый порт, и туннель умирает с ним', () => {
    const files = SCANNED_DIRS.flatMap(filesUnder)
    expect(files).toContain(STATE_TUNNEL)
    const offenders = Object.fromEntries(
      files
        .map((f) => [relative(ROOT, f), tunnelsWithoutOwnConnection(readFileSync(f, 'utf8'))])
        .filter(([, bad]) => bad.length > 0),
    )
    expect(offenders, 'ssh -L без -o ControlPath=none').toEqual({})
  })

  it('state-tunnel без хоста stand падает с подсказкой про stand-ssh, а не невнятной ошибкой ssh', () => {
    const [script] = runBlocks(readFileSync(STATE_TUNNEL, 'utf8'))
    const run = spawnSync('bash', ['-c', script], {
      env: { PATH: process.env.PATH, HOME: tempDir(), STATE_PORT: '9000' },
      encoding: 'utf8',
    })
    expect(run.status).toBe(1)
    expect(run.stdout).toContain('stand-ssh должен стоять до state-tunnel')
  })
})
