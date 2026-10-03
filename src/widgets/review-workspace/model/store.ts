import { create } from 'zustand'

export type DiffViewMode = 'side_by_side' | 'unified'

/** Состояние интерфейса из FRONTEND_ARCHITECTURE.md §8.1; данные adapter сюда не кладутся. */
type ReviewWorkspaceState = {
  /** Путь выбранного файла; `null` — пользователь ещё не выбирал, показываем первый. */
  selected_file: string | null
  /** Режим живёт в сторе, а не в `DiffViewer`: иначе он сбрасывался бы при смене файла. */
  view_mode: DiffViewMode
  /** Раскрытые свёрнутые строки контекста — по идентификатору строки, а не по номеру. */
  expanded_context_line_ids: string[]
  selectFile: (path: string) => void
  setViewMode: (mode: DiffViewMode) => void
  expandContext: (lineIds: readonly string[]) => void
}

export const initialReviewWorkspaceState = {
  selected_file: null,
  view_mode: 'side_by_side',
  expanded_context_line_ids: [],
} satisfies Partial<ReviewWorkspaceState>

export const useReviewWorkspace = create<ReviewWorkspaceState>((set) => ({
  ...initialReviewWorkspaceState,
  selectFile: (path) => set({ selected_file: path }),
  setViewMode: (view_mode) => set({ view_mode }),
  expandContext: (lineIds) =>
    set((state) => ({
      expanded_context_line_ids: [...new Set([...state.expanded_context_line_ids, ...lineIds])],
    })),
}))

/** Выбранный файл, если он есть в списке, иначе первый файл прогона. */
export function resolveSelectedPath(
  selectedPath: string | null,
  paths: readonly string[],
): string | null {
  if (selectedPath !== null && paths.includes(selectedPath)) return selectedPath
  return paths[0] ?? null
}
