import { create } from 'zustand'
import type { Severity } from '../../../entities/review/model'

type Store = {
  selectedFile: string | null
  severities: Severity[]
  selectFile: (path: string) => void
  toggleSeverity: (value: Severity) => void
}
export const useWorkspaceStore = create<Store>((set) => ({
  selectedFile: null,
  severities: ['low', 'medium', 'high', 'critical'],
  selectFile: (selectedFile) => set({ selectedFile }),
  toggleSeverity: (value) =>
    set((state) => ({
      severities: state.severities.includes(value)
        ? state.severities.filter((severity) => severity !== value)
        : [...state.severities, value],
    })),
}))
