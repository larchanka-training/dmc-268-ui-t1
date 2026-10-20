import { CheckOutlined, LinkOutlined } from '@ant-design/icons'
import { Button, Input, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AvailableRepository } from '@/entities/repository'
import { useAvailableRepositories, useConnectRepository } from '@/features/repository'
import { ApiError } from '@/shared/api'

/** Ручки уже в контракте, но бэкенд отвечает `501`, пока подключение не реализовано (api#41). */
function isNotImplemented(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NOT_IMPLEMENTED'
}

export function ConnectRepositoryPage() {
  const navigate = useNavigate()
  const { data: repos = [], isLoading, isError, error } = useAvailableRepositories()
  const connectMutation = useConnectRepository()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return repos
    return repos.filter((r) => r.full_name.toLowerCase().includes(q))
  }, [repos, search])

  const handleConnect = async (repo: AvailableRepository) => {
    try {
      await connectMutation.mutateAsync({ provider: repo.provider, provider_id: repo.provider_id })
      message.success('Репозиторий подключён')
      navigate('/repositories')
    } catch (err) {
      const text = isNotImplemented(err)
        ? 'Подключение репозиториев пока недоступно'
        : err instanceof Error
          ? err.message
          : 'Не удалось подключить репозиторий'
      message.error(text)
    }
  }

  const columns: ColumnsType<AvailableRepository> = [
    {
      title: 'Репозиторий',
      dataIndex: 'full_name',
      key: 'full_name',
    },
    {
      title: 'Провайдер',
      dataIndex: 'provider',
      key: 'provider',
      render: (p) => <Tag>{p}</Tag>,
    },
    {
      title: 'Ветка',
      dataIndex: 'default_branch',
      key: 'default_branch',
    },
    {
      title: 'Действие',
      key: 'action',
      render: (_, record) =>
        record.already_connected ? (
          <Tag icon={<CheckOutlined />} color="success">
            Подключён
          </Tag>
        ) : (
          <Button
            type="primary"
            size="small"
            icon={<LinkOutlined />}
            loading={
              connectMutation.isPending &&
              connectMutation.variables?.provider_id === record.provider_id
            }
            onClick={() => void handleConnect(record)}
          >
            Подключить
          </Button>
        ),
    },
  ]

  return (
    <div>
      <Typography.Title level={1} className="page-title">
        Подключение репозитория
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Выберите репозиторий из установки GitHub App.
      </Typography.Paragraph>
      {isError && (
        <Typography.Text type="danger" className="page-error">
          {isNotImplemented(error)
            ? 'Подключение репозиториев пока недоступно: бэкенд его ещё не реализовал'
            : 'Не удалось загрузить список репозиториев'}
        </Typography.Text>
      )}
      <Input.Search
        className="page-search"
        placeholder="Поиск по имени…"
        allowClear
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="app-content-card">
        <Table
          rowKey={(record) => `${record.provider}:${record.provider_id}`}
          loading={isLoading}
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 8 }}
        />
      </div>
    </div>
  )
}
