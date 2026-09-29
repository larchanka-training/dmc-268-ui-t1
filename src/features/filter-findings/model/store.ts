import { create } from 'zustand'

import type { ReviewFinding, Severity } from '../../../entities/review-finding'

type FilterFindingsState = {
  /** Выбранные severity; пустой набор — показывать все замечания. */
  severity_filters: Severity[]
  toggleSeverity: (severity: Severity) => void
  resetSeverities: () => void
}

export const initialFilterFindingsState = {
  severity_filters: [],
} satisfies Partial<FilterFindingsState>

export const useFilterFindings = create<FilterFindingsState>((set) => ({
  ...initialFilterFindingsState,
  toggleSeverity: (severity) =>
    set((state) => ({
      severity_filters: state.severity_filters.includes(severity)
        ? state.severity_filters.filter((item) => item !== severity)
        : [...state.severity_filters, severity],
    })),
  resetSeverities: () => set({ severity_filters: [] }),
}))

export function applySeverityFilter(
  findings: readonly ReviewFinding[],
  severities: readonly Severity[],
): ReviewFinding[] {
  if (severities.length === 0) return [...findings]
  return findings.filter((finding) => severities.includes(finding.severity))
}
