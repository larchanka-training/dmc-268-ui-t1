import { describe, expect, it } from 'vitest'

import { ContractError } from '@/shared/api'
import type { ApiSchemas } from '@/shared/api/contract'
import { fakeTransport } from '@/test/api'

import { fetchServiceStatus } from './serviceStatusApi'

const OK: ApiSchemas['ServiceStatusResponse'] = {
  status: 'operational',
  components: [
    { id: 'api', status: 'operational' },
    { id: 'worker', status: 'operational' },
    { id: 'queue', status: 'operational' },
  ],
  checked_at: '2026-11-02T10:00:00Z',
}

const answering = (body: unknown) =>
  fakeTransport({
    get: async (path) => {
      if (path !== '/status') throw new Error(`неожиданный запрос ${path}`)
      return body
    },
  })

describe('fetchServiceStatus', () => {
  it('отдаёт ответ контракта как есть', async () => {
    expect(await fetchServiceStatus(answering(OK))).toEqual(OK)
  })

  it('незнакомое состояние читает как «нет данных», а не как ошибку', async () => {
    const report = await fetchServiceStatus(
      answering({
        ...OK,
        status: 'maintenance',
        components: [{ id: 'api', status: 'maintenance' }],
      }),
    )

    expect(report.status).toBe('unknown')
    expect(report.components).toEqual([{ id: 'api', status: 'unknown' }])
  })

  it('незнакомый компонент отбрасывает, известные оставляет', async () => {
    const report = await fetchServiceStatus(
      answering({ ...OK, components: [...OK.components, { id: 'database', status: 'outage' }] }),
    )

    expect(report.components.map((component) => component.id)).toEqual(['api', 'worker', 'queue'])
  })

  it('ответ без checked_at — ошибка контракта', async () => {
    const { checked_at: _omitted, ...withoutTime } = OK
    void _omitted

    await expect(fetchServiceStatus(answering(withoutTime))).rejects.toBeInstanceOf(ContractError)
  })
})
