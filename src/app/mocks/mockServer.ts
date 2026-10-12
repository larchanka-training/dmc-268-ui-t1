export type ScenarioStep = {
  status: string
  failed_stage?: string
  failure_reason?: string
}

/** Прогон доходит до конца: очередь, три этапа, завершение. */
export const COMPLETED_SCENARIO: readonly ScenarioStep[] = [
  { status: 'queued' },
  { status: 'building_context' },
  { status: 'analysing' },
  { status: 'publishing' },
  { status: 'completed' },
]

/** Прогон падает на анализе. */
export const FAILED_SCENARIO: readonly ScenarioStep[] = [
  { status: 'queued' },
  { status: 'building_context' },
  {
    status: 'failed',
    failed_stage: 'analysing',
    failure_reason: 'LLM не ответила за отведённое время',
  },
]

type Options = {
  scenario?: readonly ScenarioStep[]
  /** Сколько прогон стоит на каждом статусе, мс. */
  stepMs?: number
}

/**
 * Общее состояние «сервера» для mock adapter и mock-потока событий: одни часы и один сценарий.
 * Благодаря этому перезапрос прогона после терминального события отдаёт тот же статус, что и
 * событие, и подписка не открывается заново. Часы идут от первого обращения к серверу.
 */
export type MockServer = {
  scenario: readonly ScenarioStep[]
  stepMs: number
  /** Момент начала сценария, мс; первое обращение запускает часы. */
  startedAt: () => number
  /** Номер текущего шага сценария. */
  currentIndex: () => number
  /** Когда прогон вошёл в шаг `index` (это и есть `last_progress_at`). */
  enteredAt: (index: number) => number
}

export function createMockServer({
  scenario = COMPLETED_SCENARIO,
  stepMs = 4_000,
}: Options = {}): MockServer {
  let started: number | null = null
  const startedAt = () => (started ??= Date.now())

  return {
    scenario,
    stepMs,
    startedAt,
    currentIndex: () =>
      Math.min(Math.floor((Date.now() - startedAt()) / stepMs), scenario.length - 1),
    enteredAt: (index) => startedAt() + index * stepMs,
  }
}
