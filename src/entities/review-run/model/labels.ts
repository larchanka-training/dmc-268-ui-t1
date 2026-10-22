import type { KnownRunStatus, RunTrigger } from './schema'

/** Подписи статусов прогона: одни и те же в бейдже, фильтре и на экране прогона. */
export const RUN_STATUS_LABELS: Record<KnownRunStatus, string> = {
  queued: 'В очереди',
  building_context: 'Сбор контекста',
  analysing: 'Анализ',
  publishing: 'Публикация',
  completed: 'Завершён',
  failed: 'Ошибка',
  cancelled: 'Отменён',
}

/** Подписи источника запуска прогона. */
export const RUN_TRIGGER_LABELS: Record<RunTrigger, string> = {
  webhook: 'Вебхук',
  manual: 'Вручную',
  mention: 'Упоминание',
}
