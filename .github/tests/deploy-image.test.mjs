/**
 * Выкат интерфейса: образ на сервере до остановки старого контейнера, и
 * остановка nginx без SIGKILL (#89).
 *
 * Ресурса docker_image у интерфейса нет: контейнер ссылается на образ по
 * digest (infra/ui.tf), и провайдер тянет образ, только если его нет на
 * сервере. Скачать его обязан шаг деплоя до apply — иначе pull из ghcr уходит
 * в простой публичного входа. Шаг ищется по тексту deploy.yml: парсера YAML в
 * зависимостях нет, а раскладка шагов job'а простая.
 *
 * nginx по SIGQUIT ждёт открытые соединения, а поток SSE живёт часами;
 * worker_shutdown_timeout в образе обрывает их раньше, чем истечёт
 * destroy_grace_seconds контейнера и Docker пошлёт SIGKILL.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const read = (path) => readFileSync(join(ROOT, path), 'utf8')

/** Шаги job'а deploy: текст от `- ` до следующего шага на том же отступе. */
function deploySteps(workflow) {
  const job = workflow.slice(workflow.indexOf('\n  deploy:\n'))
  const steps = job.slice(job.indexOf('\n    steps:\n'))
  return steps
    .split(/\n {6}- /)
    .slice(1)
    .map((step) => step.replace(/\n(?: {0,5}\S|\n {2}\S)[\s\S]*$/, ''))
}

describe('deploy.yml: образ интерфейса на сервере до apply', () => {
  const steps = deploySteps(read('.github/workflows/deploy.yml'))
  // apply — и прямой `tofu apply`, и скрипт `.github/scripts/deploy/apply.sh` (#90).
  const applyAt = steps.findIndex((s) => /\btofu apply\b|deploy\/apply\.sh/.test(s))
  const pullAt = steps.findIndex((s) => /\bdocker pull\b/.test(s))
  const loginAt = steps.findIndex((s) => s.startsWith('uses: docker/login-action@'))

  it('находит шаг apply', () => {
    expect(applyAt).toBeGreaterThan(-1)
  })

  it('скачивает образ на сервер шагом до apply', () => {
    expect(pullAt).toBeGreaterThan(-1)
    expect(pullAt).toBeLessThan(applyAt)
    const pull = steps[pullAt]
    expect(pull).toMatch(/DOCKER_HOST: ssh:\/\/stand\b/)
    expect(pull).toMatch(/IMAGE: \$\{\{ needs\.image\.outputs\.image \}\}/)
    expect(pull).toMatch(/docker pull --quiet "\$IMAGE"/)
  })

  it('входит в ghcr на раннере до pull: образ в приватном пакете', () => {
    expect(loginAt).toBeGreaterThan(-1)
    expect(loginAt).toBeLessThan(pullAt)
    expect(steps[loginAt]).toMatch(/registry: ghcr\.io/)
  })
})

describe('остановка nginx укладывается в destroy_grace_seconds', () => {
  const seconds = (re, text) => Number(re.exec(text)?.[1])
  const shutdown = seconds(/worker_shutdown_timeout (\d+)s;/, read('Dockerfile'))
  const grace = seconds(/^\s*destroy_grace_seconds\s*=\s*(\d+)\s*$/m, read('infra/ui.tf'))

  it('worker_shutdown_timeout задан в главном конфиге nginx', () => {
    expect(shutdown).toBeGreaterThan(0)
  })

  it('destroy_grace_seconds с запасом больше worker_shutdown_timeout', () => {
    // Запас — на выход мастера и закрытие QUIC после обрыва соединений.
    expect(grace).toBeGreaterThanOrEqual(shutdown + 3)
  })
})
