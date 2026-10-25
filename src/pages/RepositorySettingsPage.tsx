import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
  Typography,
} from 'antd'
import { useParams } from 'react-router-dom'
import { isNotImplemented, ApiError } from '@/shared/api'
import { ErrorState, LinkButton } from '@/shared/ui'
import {
  branchFilterProblem,
  normalizeBranchFilter,
  RulesPreview,
  RulesStatusBadge,
  SEVERITY_LEVEL_OPTIONS,
  type RepositorySettings,
} from '@/entities/repository'
import {
  repositoryKeys,
  useRepository,
  useRepositorySettings,
  useRulesStatus,
  useSaveRepositorySettings,
} from '@/features/repository'

/** Повтор имеет смысл только после сетевой или серверной ошибки: 4xx повтор не изменит. */
function isRetryable(error: unknown): boolean {
  return !(error instanceof ApiError && error.status >= 400 && error.status < 500)
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/** Блок на ручке-заглушке: она описана в контракте, но бэкенд отвечает `501 NOT_IMPLEMENTED`. */
function NotImplementedNote({ title }: { title: string }) {
  return (
    <Alert
      type="info"
      showIcon
      title={title}
      description="Ручка описана в контракте API, но бэкенд ещё не реализовал её и отвечает заглушкой 501. Данные появятся, когда он заработает."
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
  if (!data) {
    if (isNotImplemented(error))
      return <NotImplementedNote title="Настройки ревью пока недоступны" />
    return (
      <ErrorState
        title="Не удалось загрузить настройки"
        error={error}
        onRetry={isRetryable(error) ? () => void refetch() : undefined}
      />
    )
  }

  return (
    <div>
      {isError && (
        // Упавший фоновый рефетч не заменяет форму (в v5 isError=true и при живом data
        // из кэша): блок остаётся на сохранённых значениях, сверху — повтор.
        <div className="page-error">
          <ErrorState
            title="Не удалось обновить настройки — показаны сохранённые значения"
            error={error}
            onRetry={isRetryable(error) ? () => void refetch() : undefined}
          />
        </div>
      )}
      <Form
        form={form}
        layout="vertical"
        onValuesChange={() => setIsDirty(true)}
        onFinish={(values) =>
          save.mutate(
            // Нормализация под ограничения контракта: пустые и повторы не сохраняются.
            { ...values, branch_filter: normalizeBranchFilter(values.branch_filter ?? []) },
            { onSuccess: () => setIsDirty(false) },
          )
        }
        // Мутация ждёт invalidateQueries, поэтому isPending длится до прихода свежих данных:
        // поля заблокированы, пока форма и кэш могут расходиться (design.md — refetch не
        // затирает форму).
        disabled={save.isPending}
        className="max-w-xl"
      >
        {save.isError && (
          <div className="page-error">
            <ErrorState title="Не удалось сохранить настройки" error={save.error} />
          </div>
        )}
        {save.isSuccess && !isDirty && (
          <Alert className="page-error" type="success" showIcon title="Настройки сохранены" />
        )}
        <Form.Item name="auto_review_enabled" label="Авто-ревью" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item
          name="branch_filter"
          label="Фильтр веток"
          rules={[
            {
              validator: (_, value: string[] | undefined) => {
                const problem = branchFilterProblem(value ?? [])
                return problem ? Promise.reject(new Error(problem)) : Promise.resolve()
              },
            },
          ]}
        >
          <Select
            mode="tags"
            open={false}
            suffixIcon={null}
            tokenSeparators={[',']}
            placeholder="feature/**, fix/**"
          />
        </Form.Item>
        <Form.Item name="min_severity" label="Порог severity">
          <Radio.Group
            aria-label="Порог severity"
            optionType="button"
            buttonStyle="solid"
            options={SEVERITY_LEVEL_OPTIONS}
          />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            Сохранить
          </Button>
          <Button
            onClick={() => {
              form.setFieldsValue(data)
              setIsDirty(false)
              // Сброс убирает и баннеры мутации: «сохранено»/ошибка не висят над откатанной
              // формой (reset очищает isSuccess/isError мутации).
              save.reset()
            }}
          >
            Сбросить
          </Button>
        </Space>
      </Form>
    </div>
  )
}

function RulesPanel({ repositoryId }: { repositoryId: string }) {
  const { data, isLoading, isError, error, refetch } = useRulesStatus(repositoryId)

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />
  }
  if (!data) {
    if (isNotImplemented(error)) return <NotImplementedNote title="Статус правил пока недоступен" />
    return (
      <ErrorState
        title="Не удалось загрузить статус правил"
        error={error}
        onRetry={isRetryable(error) ? () => void refetch() : undefined}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {isError && (
        <ErrorState
          title="Не удалось обновить статус правил — показан последний загруженный"
          error={error}
          onRetry={isRetryable(error) ? () => void refetch() : undefined}
        />
      )}
      <RulesStatusBadge status={data} />
      <RulesPreview status={data} />
    </div>
  )
}

export function RepositorySettingsPage() {
  const { repositoryId = '' } = useParams()
  const repoQuery = useRepository(repositoryId)
  const queryClient = useQueryClient()

  // Репозиторий исчез (отключили, а ссылка осталась): список подключённых устарел.
  useEffect(() => {
    if (isNotFound(repoQuery.error)) {
      void queryClient.invalidateQueries({ queryKey: repositoryKeys.connected })
    }
  }, [repoQuery.error, queryClient])

  if (repoQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }
  if (!repoQuery.data) {
    if (isNotFound(repoQuery.error)) {
      return (
        <Result
          status="404"
          title="Репозиторий не найден"
          subTitle="Репозитория с таким адресом нет среди подключённых."
          extra={
            <LinkButton to="/repositories" type="primary">
              К списку репозиториев
            </LinkButton>
          }
        />
      )
    }
    return (
      <ErrorState
        title="Не удалось загрузить репозиторий"
        error={repoQuery.error}
        onRetry={isRetryable(repoQuery.error) ? () => void repoQuery.refetch() : undefined}
      />
    )
  }

  const repo = repoQuery.data

  return (
    <div>
      <div className="page-toolbar">
        <div>
          <Typography.Title level={1} className="page-title">
            Настройки репозитория
          </Typography.Title>
          <Typography.Text type="secondary">{repo.full_name}</Typography.Text>
        </div>
        {/* Журнал прогонов живёт на вкладке «Ревью»: сюда ведём с фильтром по этому репозиторию. */}
        <Space>
          <LinkButton to="/repositories">К списку репозиториев</LinkButton>
          <LinkButton to={`/reviews?repository_id=${encodeURIComponent(repositoryId)}`}>
            Прогоны репозитория
          </LinkButton>
        </Space>
      </div>
      {repoQuery.isError && (
        <ErrorState
          title="Не удалось обновить репозиторий — показан последний загруженный"
          error={repoQuery.error}
          onRetry={isRetryable(repoQuery.error) ? () => void repoQuery.refetch() : undefined}
        />
      )}
      {/* Ключ перемонтирует блоки при смене репозитория: черновик формы и данные не переезжают. */}
      <div className="flex flex-col gap-4">
        <Card title="Настройки ревью">
          <SettingsForm key={repositoryId} repositoryId={repositoryId} />
        </Card>
        <Card title="Правила ревью">
          <RulesPanel key={repositoryId} repositoryId={repositoryId} />
        </Card>
      </div>
    </div>
  )
}
