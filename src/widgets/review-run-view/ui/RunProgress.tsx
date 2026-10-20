import { Alert, Steps } from 'antd'
import { useEffect, useState } from 'react'

import {
  isRunStage,
  isTerminalStatus,
  RUN_STAGES,
  type ReviewRun,
  type RunStage,
} from '../../../entities/review-run'

/**
 * Через сколько без продвижения прогон считается зависшим, мс. Равно порогу бэкенда
 * `stale_run_timeout_seconds` (1800 с): раньше экран пугал бы прогоном, который бэкенд ещё ждёт.
 */
export const STALE_AFTER = 30 * 60 * 1000

/** Как часто сверяем `last_progress_at` с часами; запросов к серверу эта проверка не делает. */
const STALE_CHECK_EVERY = 30_000

type StepStatus = 'wait' | 'process' | 'finish' | 'error'

const STAGE_LABEL: Record<RunStage, string> = {
  building_context: 'Сбор контекста',
  analysing: 'Анализ LLM',
  publishing: 'Публикация',
}

const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  wait: 'ожидает',
  process: 'выполняется',
  finish: 'завершён',
  error: 'ошибка',
}

type View = {
  steps: Record<RunStage, StepStatus>
  caption: string | null
}

function allSteps(status: StepStatus): Record<RunStage, StepStatus> {
  return { building_context: status, analysing: status, publishing: status }
}

/** Шаги до `stage` завершены, на нём — `at`, после — ждут. */
function stepsAround(stage: RunStage, at: StepStatus): Record<RunStage, StepStatus> {
  const index = RUN_STAGES.indexOf(stage)
  return Object.fromEntries(
    RUN_STAGES.map((item, position): [RunStage, StepStatus] => [
      item,
      position < index ? 'finish' : position === index ? at : 'wait',
    ]),
  ) as Record<RunStage, StepStatus>
}

/** Таблица статусов из design.md; незнакомый статус шаги не двигает. */
function describeProgress(run: ReviewRun, seenStage: RunStage | null): View {
  const { status } = run
  if (isRunStage(status)) return { steps: stepsAround(status, 'process'), caption: null }

  switch (status) {
    case 'queued':
      return { steps: allSteps('wait'), caption: 'В очереди' }
    case 'completed':
      return { steps: allSteps('finish'), caption: null }
    case 'failed': {
      const stage = isRunStage(run.failed_stage) ? run.failed_stage : seenStage
      const reason = run.failure_reason
      if (stage === null) {
        return {
          steps: allSteps('wait'),
          caption: reason ? `Этап сбоя неизвестен. ${reason}` : 'Этап сбоя неизвестен',
        }
      }
      return { steps: stepsAround(stage, 'error'), caption: reason }
    }
    case 'cancelled': {
      // Этап, на котором остановили прогон, не завершён — завершены только предыдущие.
      const stage = isRunStage(run.failed_stage) ? run.failed_stage : seenStage
      return {
        steps: stage === null ? allSteps('wait') : stepsAround(stage, 'wait'),
        caption: 'Отменён',
      }
    }
    default:
      return { steps: allSteps('wait'), caption: null }
  }
}

function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}

type Props = {
  run: ReviewRun
  /** Последний этап, который экран видел у этого прогона (нужен, если `failed_stage` не пришёл). */
  seenStage: RunStage | null
}

/** Пошаговый прогресс прогона и предупреждение, если он давно не продвигался. */
export function RunProgress({ run, seenStage }: Props) {
  const now = useNow(STALE_CHECK_EVERY)
  const { steps, caption } = describeProgress(run, seenStage)

  const lastProgress = Date.parse(run.last_progress_at)
  const stale = !isTerminalStatus(run.status) && now - lastProgress > STALE_AFTER

  return (
    <section
      aria-label="Прогресс прогона"
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
    >
      {/* Смену этапа объявляем скринридеру: сам прогон идёт без действий пользователя. */}
      <div aria-live="polite">
        <Steps
          size="small"
          items={RUN_STAGES.map((stage) => ({
            status: steps[stage],
            title: (
              <>
                {STAGE_LABEL[stage]}
                <span className="sr-only">: {STEP_STATUS_LABEL[steps[stage]]}</span>
              </>
            ),
          }))}
        />
        {caption && <p className="mt-3 text-sm text-slate-700">{caption}</p>}
      </div>
      {stale && <Alert type="warning" showIcon title="Прогон давно не продвигался" />}
    </section>
  )
}
