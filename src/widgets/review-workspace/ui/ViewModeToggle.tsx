import { Button } from 'antd'

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
        <Button
          key={mode}
          size="small"
          type={value === mode ? 'primary' : 'text'}
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className="text-xs font-medium"
        >
          {label}
        </Button>
      ))}
    </div>
  )
}
