import { create } from 'zustand'

import type { ReviewFinding, Severity } from '../../../entities/review-finding'

type FilterFindingsState = {
  /** Выбранные severity; пустой набор — показывать все замечания. */
  severity_filters: Severity[]
  /** Подстрока пути для списка файлов; пустая — фильтра нет. */
  file_query: string
  /** Скрывать файлы, в которых нет замечаний под текущие фильтры замечаний. */
  only_with_findings: boolean
  /** Подстрока в тексте замечания и предлагаемом коде; пустая — фильтра нет. */
  text_query: string
  /** Сколько раз сбрасывали фильтры: по нему поле поиска отбрасывает ещё не применённый ввод. */
  reset_count: number
  toggleSeverity: (severity: Severity) => void
  resetSeverities: () => void
  setFileQuery: (query: string) => void
  setOnlyWithFindings: (value: boolean) => void
  setTextQuery: (query: string) => void
  /** Сбрасывает фильтры всех видов одним действием. */
  resetFilters: () => void
}

export const initialFilterFindingsState = {
  severity_filters: [],
  file_query: '',
  only_with_findings: false,
  text_query: '',
  reset_count: 0,
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
  setFileQuery: (file_query) => set({ file_query }),
  setOnlyWithFindings: (only_with_findings) => set({ only_with_findings }),
  setTextQuery: (text_query) => set({ text_query }),
  resetFilters: () =>
    set((state) => ({ ...initialFilterFindingsState, reset_count: state.reset_count + 1 })),
}))

export function applySeverityFilter(
  findings: readonly ReviewFinding[],
  severities: readonly Severity[],
): ReviewFinding[] {
  if (severities.length === 0) return [...findings]
  return findings.filter((finding) => severities.includes(finding.severity))
}

/** Края обрезаем, регистр не учитываем; пустая строка после этого — «фильтра нет». */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

/** Замечания, в тексте или предлагаемом коде которых есть подстрока. */
export function applyTextFilter(
  findings: readonly ReviewFinding[],
  query: string,
): ReviewFinding[] {
  const needle = normalizeQuery(query)
  if (needle === '') return [...findings]
  return findings.filter(
    (finding) =>
      finding.message.toLowerCase().includes(needle) ||
      (finding.suggestion ?? '').toLowerCase().includes(needle),
  )
}

type FindingFilters = Pick<FilterFindingsState, 'severity_filters' | 'text_query'>

/** Фильтры замечаний вместе: severity между собой через «или», с текстом — через «и». */
export function applyFindingFilters(
  findings: readonly ReviewFinding[],
  filters: FindingFilters,
): ReviewFinding[] {
  return applyTextFilter(
    applySeverityFilter(findings, filters.severity_filters),
    filters.text_query,
  )
}

type FileFilters = Pick<FilterFindingsState, 'file_query' | 'only_with_findings'>

/**
 * Список файлов под фильтры. `visibleFindings` — замечания, уже прошедшие фильтры замечаний:
 * «только с замечаниями» смотрит именно на них.
 */
export function applyFileFilters<T extends { path: string }>(
  files: readonly T[],
  visibleFindings: readonly ReviewFinding[],
  filters: FileFilters,
): T[] {
  const needle = normalizeQuery(filters.file_query)
  const withFindings = new Set(visibleFindings.map((finding) => finding.file_path))
  return files.filter(
    (file) =>
      file.path.toLowerCase().includes(needle) &&
      (!filters.only_with_findings || withFindings.has(file.path)),
  )
}

/** Есть ли хоть один включённый фильтр — тогда показываем «Сбросить фильтры». */
export function hasActiveFilters(filters: FindingFilters & FileFilters): boolean {
  return (
    filters.severity_filters.length > 0 ||
    filters.only_with_findings ||
    normalizeQuery(filters.file_query) !== '' ||
    normalizeQuery(filters.text_query) !== ''
  )
}
