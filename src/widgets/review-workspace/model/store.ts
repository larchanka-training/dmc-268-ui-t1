import { create } from 'zustand'

export type DiffViewMode = 'split' | 'unified'

type ReviewWorkspaceState = {
  /** Путь выбранного файла; `null` — пользователь ещё не выбирал, показываем первый. */
  selectedPath: string | null
  /** Режим живёт в сторе, а не в `DiffViewer`: иначе он сбрасывался бы при смене файла. */
  viewMode: DiffViewMode
  selectFile: (path: string) => void
  setViewMode: (mode: DiffViewMode) => void
}

export const initialReviewWorkspaceState = {
  selectedPath: null,
  viewMode: 'split',
} satisfies Partial<ReviewWorkspaceState>

export const useReviewWorkspace = create<ReviewWorkspaceState>((set) => ({
  ...initialReviewWorkspaceState,
  selectFile: (path) => set({ selectedPath: path }),
  setViewMode: (viewMode) => set({ viewMode }),
}))

/** Выбранный файл, если он есть в списке, иначе первый файл прогона. */
export function resolveSelectedPath(
  selectedPath: string | null,
  paths: readonly string[],
): string | null {
  if (selectedPath !== null && paths.includes(selectedPath)) return selectedPath
  return paths[0] ?? null
}
