import { Alert, Button, Empty, Modal, Space, Switch, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { RepositoryListItem } from '@/entities/repository'
import {
  useConnectRepository,
  useDisconnectRepository,
  usePendingReviewToggles,
  useRepositories,
} from '@/features/repository'
import { isNotImplemented } from '@/shared/api'
import { clampPage, pageCountOf, pageSlice, useNormalizeUrlPage, useUrlPage } from '@/shared/lib'
import { ErrorState, LinkButton, PageNav, RefreshErrorNotice } from '@/shared/ui'

const PAGE_SIZE = 10

/**
 * Установки приложения пользователя на GitHub, если `install_url` неизвестен. С ним «Управлять
 * доступом» ведёт на экран установки: там аккаунты, где приложение уже стоит, с Configure.
 */
const INSTALLATIONS_URL = 'https://github.com/settings/installations'

const NO_RIGHTS_HINT =
  'Включать и выключать ревью может участник с ролью admin или maintain в этом репозитории'

/** Итог возврата с GitHub — query-параметры, с которыми Setup URL бэкенда уводит сюда. */
const SETUP_PARAMS = ['connected', 'requested', 'setup_error']

const SETUP_ERRORS: Record<string, string> = {
  installation_not_found:
    'GitHub не нашёл эту установку среди ваших. Добавьте репозитории из GitHub ещё раз.',
  provider_unavailable:
    'GitHub не ответил. Обновите страницу позже, а ревью можно включить переключателем в строке.',
}

function setupResultOf(params: URLSearchParams) {
  const error = params.get('setup_error')
  if (error !== null) {
    return {
      type: 'error' as const,
      content: SETUP_ERRORS[error] ?? 'Не удалось завершить установку приложения на GitHub.',
    }
  }
  if (params.get('requested') === 'true') {
    return { type: 'info' as const, content: 'Запрос на установку отправлен владельцу' }
  }
  const connected = Number(params.get('connected'))
  if (params.has('connected') && Number.isInteger(connected) && connected >= 0) {
    return {
      type: 'success' as const,
      content:
        connected > 0
          ? `Подключено репозиториев: ${connected}`
          : 'Приложение установлено. Включите ревью переключателем в нужных репозиториях.',
    }
  }
  return null
}

function errorText(error: unknown, notImplemented: string, fallback: string) {
  if (isNotImplemented(error)) return notImplemented
  return error instanceof Error && error.message ? error.message : fallback
}

export function RepositoriesPage() {
  const { data, isLoading, isLoadingError, isRefetchError, error, refetch } = useRepositories()
  const connect = useConnectRepository()
  const disconnect = useDisconnectRepository()
  const pending = usePendingReviewToggles()
  const [messageApi, messageHolder] = message.useMessage()
  const [modal, modalHolder] = Modal.useModal()
  const [searchParams, setSearchParams] = useSearchParams()
  // Ошибка установки живёт до закрытия: тост на три секунды легко пропустить, а в нём инструкция.
  // С GitHub возвращаются загрузкой страницы, поэтому параметры читаются при монтировании.
  const [setupError, setSetupError] = useState(() => {
    const result = setupResultOf(searchParams)
    return result?.type === 'error' ? result.content : null
  })
  const repos = data?.items
  const installUrl = data?.install_url
  const urlPage = useUrlPage({ pageSize: PAGE_SIZE })
  const pageCount = repos && pageCountOf(repos.length, PAGE_SIZE)
  useNormalizeUrlPage(urlPage, pageCount)
  const page = clampPage(urlPage.page, pageCount)

  // Возврат с GitHub: итог и чистый URL. Успех — тостом, ошибка — плашкой на странице. Список перезапрашивается при открытии
  // страницы (данные в кэше сразу устаревают), отдельного запроса не нужно.
  useEffect(() => {
    if (!SETUP_PARAMS.some((name) => searchParams.has(name))) return
    const result = setupResultOf(searchParams)
    // Ключ: повторный вызов (StrictMode) заменяет сообщение, а не дублирует его.
    if (result && result.type !== 'error') void messageApi.open({ key: 'github-setup', ...result })
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        SETUP_PARAMS.forEach((name) => next.delete(name))
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams, messageApi])

  const toggleReview = (repo: RepositoryListItem, enable: boolean) => {
    if (enable) {
      // `mutateAsync`, а не колбэк `mutate`: следующий вызов `mutate` снял бы колбэк этой
      // строки, и её ошибка не показалась бы.
      void connect
        .mutateAsync({ provider: repo.provider, provider_id: repo.provider_id })
        .catch((err: unknown) => {
          void messageApi.error(
            errorText(err, 'Включение ревью пока недоступно', 'Не удалось включить ревью'),
          )
        })
      return
    }
    const repositoryId = repo.id
    if (repositoryId === null) return
    void modal.confirm({
      title: `Выключить ревью в ${repo.full_name}?`,
      content: 'Бот перестанет приходить в PR этого репозитория, история прогонов сохранится.',
      okText: 'Выключить',
      cancelText: 'Отмена',
      onOk: () => {
        void disconnect.mutateAsync(repositoryId).catch((err: unknown) => {
          void messageApi.error(
            errorText(err, 'Выключение ревью пока недоступно', 'Не удалось выключить ревью'),
          )
        })
      },
    })
  }

  const columns: ColumnsType<RepositoryListItem> = [
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
      title: 'Ревью',
      key: 'review',
      render: (_, record) => {
        const hintId = `no-rights-${record.provider}-${record.provider_id}`
        const loading =
          pending.connecting.includes(record.provider_id) ||
          (record.id !== null && pending.disconnecting.includes(record.id))
        return (
          <Space>
            <Switch
              aria-label={`Ревью ${record.full_name}`}
              aria-describedby={record.can_connect ? undefined : hintId}
              aria-busy={loading}
              checked={record.connected}
              disabled={!record.can_connect}
              loading={loading}
              onChange={(checked) => toggleReview(record, checked)}
            />
            {!record.can_connect && (
              <Typography.Text id={hintId} type="secondary" className="text-meta">
                {NO_RIGHTS_HINT}
              </Typography.Text>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      // Настройки и история есть у репозитория с записью в сервисе, в том числе у выключенного.
      render: (_, record) =>
        record.id !== null && (
          <LinkButton
            to={`/repositories/${record.id}/settings`}
            aria-label={`Настройки ${record.full_name}`}
          >
            Настройки
          </LinkButton>
        ),
    },
  ]

  return (
    <div>
      {messageHolder}
      {modalHolder}
      <div className="page-toolbar">
        <div>
          <Typography.Title level={1} className="page-title">
            Репозитории
          </Typography.Title>
          <Typography.Text type="secondary">
            Репозитории, на которые установлено приложение
          </Typography.Text>
        </div>
        <Space wrap>
          {/* Без `install_url` бэкенд не знает адрес установки: кнопки нет. */}
          {installUrl && (
            <Button type="primary" href={installUrl}>
              Добавить репозитории из GitHub
            </Button>
          )}
          <Typography.Link href={installUrl ?? INSTALLATIONS_URL}>
            Управлять доступом в GitHub
          </Typography.Link>
        </Space>
      </div>
      {setupError && (
        <Alert
          className="page-error"
          type="error"
          showIcon
          closable
          message="Установка на GitHub не завершилась"
          description={setupError}
          onClose={() => setSetupError(null)}
        />
      )}
      {/* Подсказка, а не тревога: `role="alert"` по умолчанию у antd зачитывался бы сразу. */}
      <Alert
        role="note"
        className="page-error"
        type="info"
        description={
          <>
            <p>
              <strong>Ревью</strong> включается и выключается переключателем в строке. Когда ревью
              выключено, бот перестаёт приходить в PR, а история прогонов сохраняется.
            </p>
            {installUrl ? (
              <p>
                <strong>Доступ бота к коду</strong> настраивается в GitHub. Кнопка «Добавить
                репозитории из GitHub» даёт доступ к новым репозиториям, ссылка «Управлять доступом
                в GitHub» его убирает. Репозитории без доступа пропадают из этого списка.
              </p>
            ) : (
              <p>
                <strong>Доступ бота к коду</strong> настраивается в GitHub по ссылке «Управлять
                доступом в GitHub». Репозитории без доступа пропадают из этого списка.
              </p>
            )}
          </>
        }
      />
      {/* Списка нет — ошибка с повтором вместо пустой таблицы, которая выглядела бы как «репозиториев нет». */}
      {isLoadingError ? (
        <ErrorState
          title="Не удалось загрузить репозитории"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : repos?.length === 0 ? (
        <div className="app-content-card">
          <Empty
            description={
              installUrl
                ? 'Приложение пока не установлено ни на один ваш репозиторий. Нажмите «Добавить репозитории из GitHub» и отметьте нужные.'
                : 'Приложение пока не установлено ни на один ваш репозиторий. Адрес установки сейчас неизвестен, обновите страницу позже.'
            }
          >
            {installUrl && (
              <Button type="primary" size="large" href={installUrl}>
                Добавить
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <div className="app-content-card">
          {/* Упал перезапрос — список остаётся, сверху плашка. */}
          {isRefetchError && (
            <RefreshErrorNotice
              title="Не удалось обновить репозитории"
              description="Показан последний полученный список."
              onRetry={() => void refetch()}
            />
          )}
          <Table
            rowKey={(record) => `${record.provider}:${record.provider_id}`}
            loading={isLoading}
            columns={columns}
            dataSource={pageSlice(repos ?? [], page, PAGE_SIZE)}
            pagination={false}
          />
          {pageCount !== undefined && (
            <PageNav page={page} pageCount={pageCount} toPage={urlPage.toPage} />
          )}
        </div>
      )}
    </div>
  )
}
