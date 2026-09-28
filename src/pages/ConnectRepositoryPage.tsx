import { CheckOutlined, LinkOutlined } from '@ant-design/icons'
import { Button, Input, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockConnectRepository, mockFetchAvailableRepositories } from '@/api/mock/repositoriesApi'
import type { AvailableRepository } from '@/types/repository'

export function ConnectRepositoryPage() {
  const navigate = useNavigate()
  const [repos, setRepos] = useState<AvailableRepository[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await mockFetchAvailableRepositories()
      setRepos(data)
    } catch {
      message.error('Не удалось загрузить список репозиториев')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    mockFetchAvailableRepositories()
      .then((data) => {
        if (!cancelled) {
          setRepos(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          message.error('Не удалось загрузить список репозиториев')
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return repos
    return repos.filter((r) => r.fullName.toLowerCase().includes(q))
  }, [repos, search])

  const handleConnect = async (repoId: string) => {
    setConnectingId(repoId)
    try {
      await mockConnectRepository(repoId)
      message.success('Репозиторий подключён')
      await load()
      navigate('/repositories')
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Не удалось подключить репозиторий'
      message.error(text)
    } finally {
      setConnectingId(null)
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
            loading={connectingId === record.id}
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
          loading={loading}
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 8 }}
        />
      </div>
    </div>
  )
}
