import type { DiffViewMode } from '../model/store'

const MODES: { mode: DiffViewMode; label: string }[] = [
  { mode: 'side_by_side', label: 'Две колонки' },
  { mode: 'unified', label: 'Одна колонка' },
]

type Props = {
  value: DiffViewMode
  onChange: (mode: DiffViewMode) => void
}

export function ViewModeToggle({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Режим диффа"
      className="inline-flex rounded-md border border-slate-300 p-0.5"
    >
      {MODES.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className={`rounded px-2.5 py-1 text-xs font-medium ${
            value === mode ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
