import type { ReviewRunAction } from '../../../entities/review-run-action'
import { formatDateTime } from '../../../shared/lib'

/**
 * Диагностика выбранного действия: только очищенные preview и ошибка. Формат preview не
 * согласован, поэтому показываем его как есть — текстом или JSON, без предметных полей.
 */
export function ActionDetails({ action }: { action: ReviewRunAction }) {
  return (
    <section aria-label={`Действие ${action.tool}`} className="space-y-3 text-sm">
      <p className="text-xs text-slate-500">
        <span className="font-mono text-slate-900">{action.tool}</span> · начато{' '}
        {formatDateTime(action.started_at)}
      </p>
      {action.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-red-800">
          <span className="font-mono">{action.error.code}</span>: {action.error.message}
        </p>
      )}
      <Preview title="Запрос" value={action.request_preview} />
      <Preview title="Ответ" value={action.response_preview} />
    </section>
  )
}

function Preview({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-slate-600">{title}</h4>
      {value === null || value === undefined ? (
        <p className="mt-1 text-xs text-slate-500">нет preview</p>
      ) : (
        <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-slate-50 p-2 font-mono text-xs whitespace-pre-wrap break-all text-slate-800">
          {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  )
}
