import type { DiffFileStatus, DiffFileSummary } from '../../../entities/diff'

const STATUS_VIEW: Record<DiffFileStatus, { mark: string; label: string; className: string }> = {
  added: { mark: 'A', label: 'добавлен', className: 'text-emerald-700' },
  modified: { mark: 'M', label: 'изменён', className: 'text-amber-700' },
  deleted: { mark: 'D', label: 'удалён', className: 'text-red-700' },
  renamed: { mark: 'R', label: 'переименован', className: 'text-sky-700' },
}

type Props = {
  files: readonly DiffFileSummary[]
  /** Число замечаний по пути файла — из тех же данных, что и карточки в диффе. */
  findingsCount: ReadonlyMap<string, number>
  selectedPath: string | null
  onSelect: (path: string) => void
}

export function FileList({ files, findingsCount, selectedPath, onSelect }: Props) {
  return (
    <nav aria-label="Изменённые файлы">
      <ul className="space-y-0.5">
        {files.map((file) => {
          const status = STATUS_VIEW[file.status]
          const selected = file.path === selectedPath
          const count = findingsCount.get(file.path) ?? 0
          return (
            <li key={file.path}>
              <button
                type="button"
                onClick={() => onSelect(file.path)}
                aria-current={selected ? 'true' : undefined}
                title={file.previous_path ? `${file.previous_path} → ${file.path}` : file.path}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  selected ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span aria-hidden className={`w-3 font-mono text-xs font-bold ${status.className}`}>
                  {status.mark}
                </span>
                <span className="sr-only">{status.label}: </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{file.path}</span>
                {count > 0 && (
                  <span className="rounded-full bg-red-100 px-1.5 text-xs font-medium text-red-800">
                    <span className="sr-only">замечаний: </span>
                    {count}
                  </span>
                )}
                <span className="font-mono text-xs">
                  <span className="text-emerald-700">+{file.additions}</span>{' '}
                  <span className="text-red-700">−{file.deletions}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
