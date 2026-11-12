import {
  ClockCircleOutlined,
  FieldTimeOutlined,
  FileSearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { RepositoryAnalytics } from '@/entities/analytics'
import {
  CATEGORY_LABEL,
  SEVERITIES,
  SEVERITY_LABEL,
  type Severity,
} from '@/entities/review-finding'
import { useRepositories } from '@/features/repository'
import { ApiError } from '@/shared/api'
import { formatDuration, formatNumber, navigation } from '@/shared/lib'
import {
  EmptyState,
  ErrorBoundary,
  ErrorState,
  LoadingState,
  RefreshErrorNotice,
} from '@/shared/ui'

import { useAnalytics } from '../model/analyticsQuery'
import { findingsSeries, utcDays } from '../model/series'
import { parseAnalyticsParams, PERIOD_PRESETS, writeAnalyticsParams } from '../model/period'

// Библиотека диаграмм тяжёлая — грузим отдельным чанком, как просмотрщик диффа.
const FindingsChart = lazy(() =>
  import('./FindingsChart').then((module) => ({ default: module.FindingsChart })),
)

const ALL = 'all'
const CATEGORIES = Object.values(CATEGORY_LABEL)

const duration = (seconds: number | null) => (seconds === null ? '—' : formatDuration(seconds))

const columns: ColumnsType<RepositoryAnalytics> = [
  { title: 'Репозиторий', dataIndex: 'full_name', key: 'full_name' },
  {
    title: 'Прогонов',
    dataIndex: 'runs_count',
    key: 'runs_count',
    align: 'right',
    render: formatNumber,
  },
  {
    title: 'Средняя длительность',
    dataIndex: 'average_duration_seconds',
    key: 'average',
    align: 'right',
    render: duration,
  },
  {
    title: 'p95',
    dataIndex: 'p95_duration_seconds',
    key: 'p95',
    align: 'right',
    render: duration,
  },
  {
    title: 'Замечаний',
    dataIndex: 'findings_count',
    key: 'findings_count',
    align: 'right',
    render: formatNumber,
  },
]

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { days, repositoryId } = parseAnalyticsParams(searchParams)
  const [severity, setSeverity] = useState<Severity | null>(null)

  const repositories = useRepositories()
  // Прогоны есть у каждого репозитория с записью в сервисе (`id`), в том числе у выключенных.
  const known = repositories.data?.items.filter((repo) => repo.id !== null) ?? []
  const { data, isLoading, isFetching, error, refetch } = useAnalytics(repositoryId, days)
  // Некорректные значения в URL уже заменены умолчаниями. Чужой или удалённый репозиторий убираем
  // по 404 бэкенда (видимость у него та же, что у списка), без новой записи в истории.
  const unknownRepository =
    repositoryId !== null && error instanceof ApiError && error.code === 'REPOSITORY_NOT_FOUND'
  useEffect(() => {
    const canonical = writeAnalyticsParams(searchParams, {
      days,
      repositoryId: unknownRepository ? null : repositoryId,
    }).toString()
    if (canonical !== searchParams.toString())
      setSearchParams(new URLSearchParams(canonical), { replace: true })
  }, [days, repositoryId, unknownRepository, searchParams, setSearchParams])

  const chartData = useMemo(
    () =>
      data
        ? findingsSeries(
            data.findings_by_day,
            utcDays(data.created_from, data.created_to),
            severity,
          )
        : [],
    [data, severity],
  )
  const totals = CATEGORIES.map((category) => ({
    category,
    count: chartData.reduce((sum, p) => sum + (p.category === category ? p.count : 0), 0),
  }))
  const hasFindings = totals.some((total) => total.count > 0)

  return (
    <div>
      <Typography.Title level={1} className="page-title">
        Аналитика
      </Typography.Title>
      <Space wrap className="page-section">
        <Segmented
          aria-label="Период"
          value={days}
          options={PERIOD_PRESETS.map((value) => ({ value, label: `${value} дн.` }))}
          onChange={(value) =>
            setSearchParams((prev) => writeAnalyticsParams(prev, { days: value, repositoryId }))
          }
        />
        <Select
          aria-label="Репозиторий"
          className="min-w-60"
          showSearch
          optionFilterProp="label"
          loading={repositories.isLoading}
          status={repositories.isLoadingError ? 'warning' : undefined}
          value={repositoryId ?? ALL}
          onChange={(value) =>
            setSearchParams((prev) =>
              writeAnalyticsParams(prev, { days, repositoryId: value === ALL ? null : value }),
            )
          }
          options={[
            { value: ALL, label: 'Все репозитории' },
            ...known.map((repo) => ({ value: repo.id!, label: repo.full_name })),
          ]}
        />
        {repositories.isLoadingError && (
          // В списке всегда есть «Все репозитории», поэтому ошибка рядом с фильтром, а не в нём.
          <span role="alert" className="text-sm">
            Не удалось загрузить репозитории.{' '}
            <Button
              size="small"
              type="link"
              icon={<ReloadOutlined aria-hidden />}
              onClick={() => void repositories.refetch()}
            >
              Повторить
            </Button>
          </span>
        )}
        <Select
          aria-label="Важность"
          className="min-w-40"
          value={severity ?? ALL}
          onChange={(value) => setSeverity(value === ALL ? null : (value as Severity))}
          options={[
            { value: ALL, label: 'Любая важность' },
            ...SEVERITIES.map((value) => ({ value, label: SEVERITY_LABEL[value] })),
          ]}
        />
        {/* На экране прежний ответ, пока идёт новый: индикатор рядом с фильтрами, а не обёртка
            результатов — у Spin antd aria-live, и скринридер зачитывал бы таблицу целиком. */}
        <Spin spinning={isFetching && !isLoading} delay={200} size="small" />
      </Space>

      {isLoading && (
        <div className="page-section">
          <LoadingState label="Загрузка аналитики…" />
        </div>
      )}
      {error && !unknownRepository && (
        <div className="page-section">
          {data ? (
            <RefreshErrorNotice
              title="Не удалось обновить аналитику"
              onRetry={() => void refetch()}
            />
          ) : (
            <ErrorState
              title="Не удалось загрузить аналитику"
              error={error}
              onRetry={() => void refetch()}
            />
          )}
        </div>
      )}
      {data && data.runs.count === 0 && (
        <div className="page-section">
          <EmptyState>За выбранный период нет завершённых ревью.</EmptyState>
        </div>
      )}
      {data && data.runs.count > 0 && (
        <>
          <Row gutter={[16, 16]} className="page-section">
            <Col xs={24} sm={8}>
              <Card className="app-content-card h-full">
                <Statistic
                  title="Прогонов"
                  value={formatNumber(data.runs.count)}
                  prefix={<FileSearchOutlined aria-hidden />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="app-content-card h-full">
                <Statistic
                  title="Средняя длительность"
                  prefix={<ClockCircleOutlined aria-hidden />}
                  value={duration(data.runs.average_duration_seconds)}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="app-content-card h-full">
                <Statistic
                  title="p95 длительности"
                  prefix={<FieldTimeOutlined aria-hidden />}
                  value={duration(data.runs.p95_duration_seconds)}
                />
              </Card>
            </Col>
          </Row>
          <Card className="app-content-card page-section">
            <Typography.Title level={2}>Замечания по дням</Typography.Title>
            <Typography.Paragraph type="secondary">
              Дни по UTC; крайние дни периода неполные.
            </Typography.Paragraph>
            {hasFindings ? (
              <>
                <p className="sr-only">
                  Замечания за период:{' '}
                  {totals.map((t) => `${t.category} — ${formatNumber(t.count)}`).join('; ')}.
                </p>
                <ErrorBoundary
                  fallback={(err) => (
                    <ErrorState
                      title="Не удалось отобразить диаграмму"
                      error={err}
                      // Не reset: React.lazy запоминает упавшую загрузку чанка, а после деплоя
                      // старого чанка нет вовсе. Перезагрузка берёт свежий index.html.
                      onRetry={() => navigation.reload()}
                    />
                  )}
                >
                  <Suspense fallback={<LoadingState label="Загрузка диаграммы…" />}>
                    <FindingsChart data={chartData} />
                  </Suspense>
                </ErrorBoundary>
              </>
            ) : (
              <Typography.Paragraph>
                {severity ? 'Замечаний этой важности за период нет' : 'За период замечаний нет'}
              </Typography.Paragraph>
            )}
          </Card>
          <Card className="app-content-card page-section">
            <Typography.Title level={2}>По репозиториям</Typography.Title>
            <Table
              rowHoverable={false}
              rowKey="repository_id"
              columns={columns}
              dataSource={data.by_repository}
              pagination={false}
              scroll={{ x: true }}
            />
          </Card>
        </>
      )}
    </div>
  )
}
