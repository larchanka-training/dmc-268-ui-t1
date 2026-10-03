import { create } from 'zustand'

type RunInspectorState = {
  /** Выбранное действие; `null` — не выбрано, детали не показываются. */
  selected_action_id: string | null
  selectAction: (id: string) => void
}

export const initialRunInspectorState = {
  selected_action_id: null,
} satisfies Partial<RunInspectorState>

export const useRunInspector = create<RunInspectorState>((set) => ({
  ...initialRunInspectorState,
  selectAction: (id) => set({ selected_action_id: id }),
}))
