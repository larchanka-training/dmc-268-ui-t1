import { Link } from 'react-router-dom'
import { Button, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Repository } from '@/entities/repository'
import { useConnectedRepositories } from '@/features/repository'
import {
  clampPage,
  formatDateTime,
  pageCountOf,
  pageSlice,
  useNormalizeUrlPage,
  useUrlPage,
} from '@/shared/lib'
import { PageNav } from '@/shared/ui'

const PAGE_SIZE = 10

export function RepositoriesPage() {
  const { data: repos, isLoading, isError } = useConnectedRepositories()
  const urlPage = useUrlPage({ pageSize: PAGE_SIZE })
  const pageCount = repos && pageCountOf(repos.length, PAGE_SIZE)
  useNormalizeUrlPage(urlPage, pageCount)
  const page = clampPage(urlPage.page, pageCount)

  const columns: ColumnsType<Repository> = [
    {
      title: 'Репозиторий',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{value}</Typography.Text>
          <Typography.Text type="secondary" className="text-meta">
            ветка по умолчанию: {record.default_branch}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Провайдер',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider) => <Tag>{provider}</Tag>,
    },
    {
      title: 'Автоматическое ревью',
      dataIndex: 'auto_review_enabled',
      key: 'auto_review_enabled',
      render: (enabled: boolean) =>
        enabled ? <Tag color="success">Включено</Tag> : <Tag>Выключено</Tag>,
    },
    {
      title: 'Подключён',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => formatDateTime(value),
    },
  ]

  return (
    <div>
      <div className="page-toolbar">
        <div>
          <Typography.Title level={1} className="page-title">
            Репозитории
          </Typography.Title>
          <Typography.Text type="secondary">
            Репозитории, подключённые к этому рабочему пространству
          </Typography.Text>
        </div>
        <Link to="/repositories/connect">
          <Button type="primary">Подключить репозиторий</Button>
        </Link>
      </div>
      {isError && (
        <Typography.Text type="danger" className="page-error">
          Не удалось загрузить репозитории
        </Typography.Text>
      )}
      <div className="app-content-card">
        <Table
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={pageSlice(repos ?? [], page, PAGE_SIZE)}
          pagination={false}
        />
        {pageCount !== undefined && (
          <PageNav page={page} pageCount={pageCount} toPage={urlPage.toPage} />
        )}
      </div>
    </div>
  )
}
