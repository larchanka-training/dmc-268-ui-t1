import { CheckOutlined, LinkOutlined } from '@ant-design/icons'
import { Button, Input, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AvailableRepository } from '@/entities/repository'
import { useAvailableRepositories, useConnectRepository } from '@/features/repository'

export function ConnectRepositoryPage() {
  const navigate = useNavigate()
  const { data: repos = [], isLoading, isError } = useAvailableRepositories()
  const connectMutation = useConnectRepository()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return repos
    return repos.filter((r) => r.fullName.toLowerCase().includes(q))
  }, [repos, search])

  const handleConnect = async (repoId: string) => {
    try {
      await connectMutation.mutateAsync(repoId)
      message.success('Репозиторий подключён')
      navigate('/repositories')
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Не удалось подключить репозиторий'
      message.error(text)
    }
  }

  const columns: ColumnsType<AvailableRepository> = [
    {
      title: 'Репозиторий',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Провайдер',
      dataIndex: 'provider',
      key: 'provider',
      render: (p) => <Tag>{p}</Tag>,
    },
    {
      title: 'Ветка',
      dataIndex: 'defaultBranch',
      key: 'defaultBranch',
    },
    {
      title: 'Действие',
      key: 'action',
      render: (_, record) =>
        record.alreadyConnected ? (
          <Tag icon={<CheckOutlined />} color="success">
            Подключён
          </Tag>
        ) : (
          <Button
            type="primary"
            size="small"
            icon={<LinkOutlined />}
            loading={connectMutation.isPending && connectMutation.variables === record.id}
            onClick={() => handleConnect(record.id)}
          >
            Подключить
          </Button>
        ),
    },
  ]

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Подключение репозитория
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Выберите репозиторий из вашей учётной записи VCS. Данные имитируются до появления API.
      </Typography.Paragraph>
      {isError && (
        <Typography.Text type="danger" style={{ display: 'block', marginBottom: 12 }}>
          Не удалось загрузить список репозиториев
        </Typography.Text>
      )}
      <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
        <Input.Search
          placeholder="Поиск по имени…"
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </Space>
      <div className="app-content-card">
        <Table
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 8 }}
        />
      </div>
    </div>
  )
}
