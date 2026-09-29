import { Link } from 'react-router-dom'
import { Button, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { mockFetchConnectedRepositories } from '@/api/mock/repositoriesApi'
import { repositoryStatusLabel } from '@/i18n/repository'
import type { ConnectedRepository } from '@/types/repository'
import dayjs from 'dayjs'

const statusColor: Record<ConnectedRepository['status'], string> = {
  connected: 'success',
  syncing: 'processing',
  error: 'error',
}

export function RepositoriesPage() {
  const [repos, setRepos] = useState<ConnectedRepository[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    mockFetchConnectedRepositories()
      .then((data) => {
        if (!cancelled) {
          setRepos(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          message.error('Не удалось загрузить репозитории')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const columns: ColumnsType<ConnectedRepository> = [
    {
      title: 'Репозиторий',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{value}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ветка по умолчанию: {record.defaultBranch}
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
      title: 'Видимость',
      dataIndex: 'private',
      key: 'private',
      render: (isPrivate: boolean) => (isPrivate ? 'Приватный' : 'Публичный'),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: ConnectedRepository['status']) => (
        <Tag color={statusColor[status]}>{repositoryStatusLabel[status]}</Tag>
      ),
    },
    {
      title: 'Последняя синхронизация',
      dataIndex: 'lastSyncAt',
      key: 'lastSyncAt',
      render: (value?: string) => (value ? dayjs(value).format('D MMM, HH:mm') : '—'),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
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
      <div className="app-content-card">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={repos}
          pagination={{ pageSize: 10 }}
        />
      </div>
    </div>
  )
}
