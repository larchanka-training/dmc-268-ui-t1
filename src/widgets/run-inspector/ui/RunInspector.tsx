import { useMemo } from 'react'

import { byPosition, type ReviewRunAction } from '../../../entities/review-run-action'
import { EmptyState } from '../../../shared/ui'
import { useRunInspector } from '../model/store'
import { ActionDetails } from './ActionDetails'
import { ActionTree } from './ActionTree'

/** Что происходило внутри прогона: mock-действия worker (FE-DEC-07), без полного payload. */
export function RunInspector({ actions }: { actions: readonly ReviewRunAction[] }) {
  const { selected_action_id, selectAction } = useRunInspector()
  const ordered = useMemo(() => [...actions].sort(byPosition), [actions])
  const selected = ordered.find((action) => action.id === selected_action_id)

  return (
    <section
      aria-labelledby="run-inspector-title"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 id="run-inspector-title" className="text-base font-semibold text-slate-900">
        Ход прогона
      </h2>
      {ordered.length === 0 ? (
        <div className="mt-3">
          <EmptyState>Действий прогона пока нет.</EmptyState>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <ActionTree actions={ordered} selectedId={selected?.id ?? null} onSelect={selectAction} />
          {selected ? (
            <ActionDetails action={selected} />
          ) : (
            <p className="text-sm text-slate-500">Выберите действие, чтобы увидеть детали.</p>
          )}
        </div>
      )}
    </section>
  )
}
