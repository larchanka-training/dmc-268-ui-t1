import { useState } from 'react'
import type { ReviewState } from '../../entities/review/model'

export function RunInspector({ actions }: { actions: ReviewState['actions'] }) {
  const [selectedId, setSelectedId] = useState(actions[0]?.id)
  const selected = actions.find((action) => action.id === selectedId)
  if (!selected) return null
  return (
    <section aria-label="Хронология прогона">
      <h2>Хронология прогона</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <ActionTree actions={actions} selectedId={selected.id} onSelect={setSelectedId} />
        <ActionDetails action={selected} />
      </div>
    </section>
  )
}

export function ActionTree({
  actions,
  selectedId,
  onSelect,
}: {
  actions: ReviewState['actions']
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <ul>
      {actions.map((action) => (
        <li key={action.id}>
          <button
            type="button"
            aria-pressed={action.id === selectedId}
            onClick={() => onSelect(action.id)}
          >
            {action.tool}
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ActionDetails({ action }: { action: ReviewState['actions'][number] }) {
  return (
    <article>
      <h3>{action.tool}</h3>
      <p>Статус: {action.status}</p>
      <p>Длительность: {action.durationSeconds} с</p>
      <p>{action.preview}</p>
    </article>
  )
}
