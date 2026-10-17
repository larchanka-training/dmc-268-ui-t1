import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Form,
  Radio,
  Result,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { formatDateTime } from '@/shared/lib'
import {
  RulesPreview,
  RulesStatusBadge,
  SEVERITY_LEVEL_OPTIONS,
  type HistoryRun,
  type RepositorySettings,
} from '@/entities/repository'
import { RunStatusBadge } from '@/entities/review-run'
import {
  useConnectedRepositories,
  useRepositoryHistory,
  useRepositorySettings,
  useRulesStatus,
  useSaveRepositorySettings,
} from '@/features/repository'

/** Ошибка одного блока: сообщение и повтор, соседние блоки продолжают работать. */
function BlockError({
  text,
  onRetry,
  error,
}: {
  text: string
  onRetry: () => void
  error?: Error | null
}) {
  return (
    <Alert
      type="error"
      showIcon
      message={text}
      description={error instanceof Error ? error.message : undefined}
      action={
        <Button size="small" onClick={onRetry}>
          Повторить
        </Button>
      }
    />
  )
}

function SettingsForm({ repositoryId }: { repositoryId: string }) {
  const [form] = Form.useForm<RepositorySettings>()
  const [isDirty, setIsDirty] = useState(false)
  const { data, isLoading, isError, error, refetch } = useRepositorySettings(repositoryId)
  const save = useSaveRepositorySettings(repositoryId)

  useEffect(() => {
    if (!data || isDirty) return
    form.setFieldsValue(data)
  }, [data, isDirty, form])

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />
  }
  if (isError || !data) {
    return (
      <BlockError
        text="Не удалось загрузить настройки"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={data}
      onValuesChange={() => setIsDirty(true)}
      onFinish={(values) => save.mutate(values, { onSuccess: () => setIsDirty(false) })}
      // Мутация ждёт invalidateQueries, поэтому isPending длится до прихода свежих данных:
      // поля заблокированы, пока форма и кэш могут расходиться (design.md — refetch не
      // затирает форму).
      disabled={save.isPending}
      className="max-w-xl"
    >
      {save.isError && (
        <Alert
          className="page-error"
          type="error"
          showIcon
          message="Не удалось сохранить настройки"
          description={save.error instanceof Error ? save.error.message : 'Попробуйте позже'}
        />
      )}
      {save.isSuccess && !isDirty && (
        <Alert className="page-error" type="success" showIcon message="Настройки сохранены" />
      )}
      <Form.Item name="autoReviewEnabled" label="Авто-ревью" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="branchFilter" label="Фильтр веток">
        <Select
          mode="tags"
          open={false}
          suffixIcon={null}
          tokenSeparators={[',']}
          placeholder="feature/**, fix/**"
        />
      </Form.Item>
      <Form.Item name="minSeverity" label="Порог severity">
        <Radio.Group optionType="button" buttonStyle="solid" options={SEVERITY_LEVEL_OPTIONS} />
      </Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" loading={save.isPending}>
          Сохранить
        </Button>
        <Button
          onClick={() => {
            form.setFieldsValue(data)
            setIsDirty(false)
          }}
        >
          Сбросить
        </Button>
      </Space>
    </Form>
  )
}

function RulesPanel({ repositoryId }: { repositoryId: string }) {
  const { data, isLoading, isError, error, refetch } = useRulesStatus(repositoryId)

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />
  }
  if (isError || !data) {
    return (
      <BlockError
        text="Не удалось загрузить статус правил"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <RulesStatusBadge status={data} />
      <RulesPreview status={data} />
    </div>
  )
}

function HistoryTable({ repositoryId }: { repositoryId: string }) {
  const { data, isLoading, isError, error, refetch } = useRepositoryHistory(repositoryId)

  const columns: ColumnsType<HistoryRun> = [
    {
      title: 'Запрос на изменение',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => <Link to={`/reviews/${record.id}`}>{title}</Link>,
    },
    { title: 'Ветка', dataIndex: 'sourceBranch', key: 'sourceBranch' },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <RunStatusBadge status={status} />,
    },
    {
      title: 'Время',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDateTime(value),
    },
  ]

  if (isError) {
    return (
      <BlockError
        text="Не удалось загрузить историю проверок"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      columns={columns}
      dataSource={data ?? []}
      pagination={false}
      locale={{ emptyText: 'Проверок ещё не было' }}
    />
  )
}

export function RepositorySettingsPage() {
  const { repositoryId = '' } = useParams()
  const reposQuery = useConnectedRepositories()
  const repo = reposQuery.data?.find((r) => r.id === repositoryId)

  if (reposQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }
  if (reposQuery.isError) {
    return (
      <BlockError
        text="Не удалось загрузить репозитории"
        error={reposQuery.error}
        onRetry={() => void reposQuery.refetch()}
      />
    )
  }
  if (!repo) {
    return (
      <Result
        status="404"
        title="Репозиторий не найден"
        subTitle="Репозитория с таким адресом нет среди подключённых."
        extra={
          <Link to="/repositories">
            <Button type="primary">К списку репозиториев</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <div className="page-toolbar">
        <div>
          <Typography.Title level={1} className="page-title">
            Настройки репозитория
          </Typography.Title>
          <Typography.Text type="secondary">{repo.fullName}</Typography.Text>
        </div>
        <Link to="/repositories">
          <Button>К списку репозиториев</Button>
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        <Card title="Настройки ревью">
          <SettingsForm repositoryId={repositoryId} />
        </Card>
        <Card title="Правила ревью">
          <RulesPanel repositoryId={repositoryId} />
        </Card>
        <Card title="История проверок">
          <HistoryTable repositoryId={repositoryId} />
        </Card>
      </div>
    </div>
  )
}
