import { Button, Input, Segmented, Select } from 'antd'
import { useState } from 'react'

import { KNOWN_STATUSES, RUN_STATUS_LABELS, type KnownRunStatus } from '@/entities/review-run'
import { useConnectedRepositories } from '@/features/repository'

import { MAX_REPOSITORIES, type ActivityFilter, type ReviewListFilters } from '../model/filters'

type Props = {
  filters: ReviewListFilters
  onChange: (patch: Partial<ReviewListFilters>) => void
  onReset?: () => void
}

const ACTIVITY_OPTIONS: { label: string; value: ActivityFilter }[] = [
  { label: 'Все', value: 'all' },
  { label: 'Активные', value: 'active' },
  { label: 'Завершённые', value: 'finished' },
]

const STATUS_OPTIONS = KNOWN_STATUSES.map((status) => ({
  label: RUN_STATUS_LABELS[status],
  value: status,
}))

/**
 * Поле, которое применяется по Enter, кнопке поиска или очистке: каждый символ не уходит
 * запросом на сервер. Текст в поле — своё состояние; когда значение в URL меняется не из
 * поля («назад», ссылка, сброс), поле его подхватывает.
 */
function CommitInput({
  value,
  label,
  placeholder,
  onCommit,
}: {
  value: string
  label: string
  placeholder: string
  onCommit: (value: string) => void
}) {
  const [text, setText] = useState(value)
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setText(value)
  }
  return (
    <Input.Search
      aria-label={label}
      placeholder={placeholder}
      allowClear
      value={text}
      onChange={(event) => setText(event.target.value)}
      onSearch={(next) => {
        if (next.trim() !== value) onCommit(next)
      }}
    />
  )
}

export function ReviewFilters({ filters, onChange, onReset }: Props) {
  const {
    data: repositories,
    isLoading: repositoriesLoading,
    isLoadingError: repositoriesFailed,
    refetch: refetchRepositories,
  } = useConnectedRepositories()
  // Репозиторий из ссылки может быть уже не подключён: показываем его id, а не теряем фильтр.
  const repositoryOptions = [
    ...(repositories ?? []).map((repo) => ({ label: repo.full_name, value: repo.id })),
    ...filters.repositoryIds
      .filter((id) => repositories !== undefined && !repositories.some((repo) => repo.id === id))
      .map((id) => ({ label: id, value: id })),
  ]

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <CommitInput
            value={filters.q}
            label="Поиск прогонов"
            placeholder="Заголовок, номер PR, автор, ветка…"
            onCommit={(q) => onChange({ q })}
          />
        </div>
        <Segmented
          aria-label="Активность прогонов"
          options={ACTIVITY_OPTIONS}
          value={filters.activity}
          onChange={(activity) => onChange({ activity })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select<KnownRunStatus[]>
          mode="multiple"
          aria-label="Статус"
          placeholder="Статус"
          allowClear
          virtual={false}
          className="min-w-48"
          options={STATUS_OPTIONS}
          value={filters.statuses}
          onChange={(statuses) => onChange({ statuses })}
        />
        <Select<string[]>
          mode="multiple"
          aria-label="Репозиторий"
          placeholder="Репозиторий"
          allowClear
          virtual={false}
          loading={repositoriesLoading}
          status={repositoriesFailed ? 'warning' : undefined}
          notFoundContent={
            repositoriesFailed ? (
              <div role="alert" className="text-sm">
                Не удалось загрузить репозитории.{' '}
                <Button size="small" type="link" onClick={() => void refetchRepositories()}>
                  Повторить
                </Button>
              </div>
            ) : undefined
          }
          className="min-w-64"
          options={repositoryOptions}
          // Лимит контракта: больше 50 репозиториев выбрать нельзя, а не срезается молча.
          maxCount={MAX_REPOSITORIES}
          optionFilterProp="label"
          value={filters.repositoryIds}
          onChange={(repositoryIds) => onChange({ repositoryIds })}
        />
        <div className="w-48">
          <CommitInput
            value={filters.author}
            label="Автор"
            placeholder="Логин автора"
            onCommit={(author) => onChange({ author })}
          />
        </div>
        <Input
          type="date"
          aria-label="Начало периода"
          className="w-40"
          value={filters.from ?? ''}
          max={filters.to ?? undefined}
          onChange={(event) => onChange({ from: event.target.value || null })}
        />
        <Input
          type="date"
          aria-label="Конец периода"
          className="w-40"
          value={filters.to ?? ''}
          min={filters.from ?? undefined}
          onChange={(event) => onChange({ to: event.target.value || null })}
        />
        {onReset && <Button onClick={onReset}>Сбросить фильтры</Button>}
      </div>
    </div>
  )
}
