import { CheckOutlined, LinkOutlined } from '@ant-design/icons'
import { Button, Input, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router-dom'
import type { AvailableRepository } from '@/entities/repository'
import { useAvailableRepositories, useConnectRepository } from '@/features/repository'
import { ApiError } from '@/shared/api'
import {
  PAGE_PARAM,
  clampPage,
  pageCountOf,
  pageSlice,
  useNormalizeUrlPage,
  useUrlPage,
} from '@/shared/lib'
import { PageNav } from '@/shared/ui'

/** Query-параметр поиска по имени. */
const SEARCH_PARAM = 'q'
const PAGE_SIZE = 8

/** Метка в `location.state` у записей истории, которые создал сам ввод поиска. */
const SEARCH_EDIT = { searchEdit: true }

function isSearchEdit(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'searchEdit' in state
}

/** Ручки уже в контракте, но бэкенд отвечает `501`, пока подключение не реализовано (api#41). */
function isNotImplemented(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NOT_IMPLEMENTED'
}

export function ConnectRepositoryPage() {
  const navigate = useNavigate()
  const { data: repos, isLoading, isError, error } = useAvailableRepositories()
  const connectMutation = useConnectRepository()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  // Поиск — в URL (`q`), как и страница: фильтр строится по нему.
  const search = searchParams.get(SEARCH_PARAM) ?? ''
  // Текст в поле — своё состояние поля: роутер обновляет URL в transition, и поле, связанное
  // с URL напрямую, теряло бы символы при быстром наборе. Пока пользователь печатает, URL
  // догоняет поле; любой другой переход — «назад»/«вперёд», ссылка, меню — ставит в поле `q`.
  const [searchText, setSearchText] = useState(search)
  const [seenKey, setSeenKey] = useState(location.key)
  if (location.key !== seenKey) {
    setSeenKey(location.key)
    if (navigationType === 'POP' || !isSearchEdit(location.state)) setSearchText(search)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || !repos) return repos
    return repos.filter((r) => r.full_name.toLowerCase().includes(q))
  }, [repos, search])
  const urlPage = useUrlPage({ pageSize: PAGE_SIZE })
  const pageCount = filtered && pageCountOf(filtered.length, PAGE_SIZE)
  useNormalizeUrlPage(urlPage, pageCount)
  const page = clampPage(urlPage.page, pageCount)

  const handleSearchChange = (value: string) => {
    // Первая правка серии — новая запись в истории, чтобы «назад» вернул прежний поиск и
    // страницу; следующие её заменяют. Серия — пока текущая запись создана поиском или URL
    // ещё не догнал поле.
    const continuesSeries = isSearchEdit(location.state) || searchText !== search
    setSearchText(value)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(SEARCH_PARAM, value)
        else next.delete(SEARCH_PARAM)
        // Новый поиск — с первой страницы.
        next.delete(PAGE_PARAM)
        return next
      },
      { replace: continuesSeries, state: SEARCH_EDIT },
    )
  }

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
        value={searchText}
        onChange={(e) => handleSearchChange(e.target.value)}
      />
      <div className="app-content-card">
        <Table
          rowKey={(record) => `${record.provider}:${record.provider_id}`}
          loading={isLoading}
          columns={columns}
          dataSource={pageSlice(filtered ?? [], page, PAGE_SIZE)}
          pagination={false}
        />
        {pageCount !== undefined && (
          <PageNav page={page} pageCount={pageCount} toPage={urlPage.toPage} />
        )}
      </div>
    </div>
  )
}
