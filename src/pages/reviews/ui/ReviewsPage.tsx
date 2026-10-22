import { ExportOutlined } from '@ant-design/icons'
import { Alert, Select, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { RUN_TRIGGER_LABELS, RunStatusBadge, type ReviewRunListItem } from '@/entities/review-run'
import { ConnectionNotice, useRunListLiveUpdates } from '@/features/live-run-status'
import {
  clampPage,
  formatDateTime,
  formatDuration,
  formatNumber,
  PAGE_PARAM,
  pageCountOf,
  safeExternalUrl,
  useNormalizeUrlPage,
  useUrlPage,
} from '@/shared/lib'
import { ErrorState, PageNav } from '@/shared/ui'

import {
  DEFAULT_PAGE_SIZE,
  FILTER_PARAMS,
  hasActiveFilters,
  PAGE_SIZES,
  parseFilters,
  parsePageSize,
  toListQuery,
  writeFilters,
  type ReviewListFilters,
} from '../model/filters'
import {
  isNotImplemented,
  REVIEW_LIST_KEY,
  reviewListKey,
  useReviewRunList,
} from '../model/reviewList'
import { ReviewFilters } from './ReviewFilters'

/** Адрес экрана прогона внутри приложения (`basename` роутера — `/app`). */
function runScreenPath(id: string) {
  return `/reviews/${encodeURIComponent(id)}`
}

const columns: ColumnsType<ReviewRunListItem> = [
  {
    title: 'Репозиторий',
    key: 'repository',
    render: (_, run) => run.merge_request.repository.full_name,
  },
  {
    title: 'PR',
    key: 'pr',
    render: (_, run) => {
      const mr = run.merge_request
      const providerUrl = mr.url ? safeExternalUrl(mr.url) : null
      return (
        <span className="inline-flex items-baseline gap-2">
          <Link to={runScreenPath(run.id)}>
            #{mr.number} {mr.title}
          </Link>
          {providerUrl && (
            <a
              href={providerUrl}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`PR #${mr.number} у провайдера`}
            >
              <ExportOutlined aria-hidden />
            </a>
          )}
        </span>
      )
    },
  },
  {
    title: 'Статус',
    key: 'status',
    render: (_, run) => <RunStatusBadge status={run.status} />,
  },
  {
    title: 'Запуск',
    key: 'trigger',
    render: (_, run) => RUN_TRIGGER_LABELS[run.trigger],
  },
  {
    title: 'Начало',
    key: 'created_at',
    render: (_, run) => formatDateTime(run.created_at),
  },
  {
    title: 'Длительность',
    key: 'duration',
    render: (_, run) =>
      run.duration_seconds === null ? '—' : formatDuration(run.duration_seconds),
  },
  {
    title: 'Замечания',
    key: 'findings',
    align: 'right',
    render: (_, run) => formatNumber(run.findings_count),
  },
]

export function ReviewsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const pageSize = parsePageSize(searchParams.get(FILTER_PARAMS.pageSize))
  const urlPage = useUrlPage({ pageSize })
  const query = useMemo(
    () => toListQuery(filters, { limit: pageSize, offset: urlPage.offset }),
    [filters, pageSize, urlPage.offset],
  )
  const queryKey = useMemo(() => reviewListKey(query), [query])
  const list = useReviewRunList(query)

  // `total` предыдущей страницы, пока новая не пришла, устарел: по нему страницу не ограничиваем.
  const pageCount =
    list.data && !list.isPlaceholderData ? pageCountOf(list.data.total, pageSize) : undefined
  useNormalizeUrlPage(urlPage, pageCount)
  const page = clampPage(urlPage.page, pageCount)
  const filtered = hasActiveFilters(filters)
  const notImplemented = isNotImplemented(list.error)

  const live = useRunListLiveUpdates({
    enabled: list.data !== undefined,
    queryKey,
    listKey: REVIEW_LIST_KEY,
    canUpsert: !filtered && page === 1,
    pageSize,
  })

  const changeFilters = (patch: Partial<ReviewListFilters>) =>
    setSearchParams((prev) => writeFilters(prev, patch))

  const resetFilters = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      const size = prev.get(FILTER_PARAMS.pageSize)
      if (size !== null) next.set(FILTER_PARAMS.pageSize, size)
      return next
    })

  const changePageSize = (size: number) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (size === DEFAULT_PAGE_SIZE) next.delete(FILTER_PARAMS.pageSize)
      else next.set(FILTER_PARAMS.pageSize, String(size))
      next.delete(PAGE_PARAM)
      return next
    })

  return (
    <div>
      <div className="page-toolbar">
        <div>
          <Typography.Title level={1} className="page-title">
            Ревью
          </Typography.Title>
          <Typography.Text type="secondary">
            Прогоны ревью по репозиториям, к которым у вас есть доступ
          </Typography.Text>
        </div>
      </div>
      {notImplemented ? (
        <Alert
          type="info"
          showIcon
          title="Список прогонов ещё не реализован на сервере"
          description="Бэкенд пока отвечает на GET /api/v1/reviews заглушкой 501. Экран отдельного прогона по ссылке работает."
        />
      ) : (
        <>
          <ReviewFilters
            filters={filters}
            onChange={changeFilters}
            onReset={filtered ? resetFilters : undefined}
          />
          <div className="mb-3 flex flex-col gap-2">
            <ConnectionNotice state={live.streamState} onRefresh={() => void live.refresh()} />
            {list.isError && (
              <ErrorState
                title="Не удалось загрузить прогоны"
                error={list.error}
                onRetry={() => void list.refetch()}
              />
            )}
          </div>
          <div className="app-content-card">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <Typography.Text type="secondary" aria-live="polite">
                {list.data ? `Найдено прогонов: ${formatNumber(list.data.total)}` : ' '}
              </Typography.Text>
              <Select<number>
                aria-label="Строк на странице"
                size="small"
                value={pageSize}
                options={PAGE_SIZES.map((size) => ({ label: `${size} на странице`, value: size }))}
                onChange={changePageSize}
              />
            </div>
            <Table
              rowKey="id"
              loading={list.isLoading}
              columns={columns}
              dataSource={list.data?.items ?? []}
              pagination={false}
              locale={{
                emptyText: filtered ? 'Нет прогонов под эти фильтры' : 'Прогонов пока нет',
              }}
              onRow={(run) => ({
                className: 'cursor-pointer',
                onClick: (event) => {
                  // Ссылки в строке ведут сами: на экран прогона или к провайдеру.
                  if ((event.target as HTMLElement).closest('a')) return
                  void navigate(runScreenPath(run.id))
                },
              })}
            />
            {pageCount !== undefined && (
              <PageNav page={page} pageCount={pageCount} toPage={urlPage.toPage} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
