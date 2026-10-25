import { Alert, Button } from 'antd'

type Props = {
  /** Что не удалось обновить — «Не удалось обновить прогон». */
  title: string
  description?: string
  onRetry: () => void
}

/**
 * Упал перезапрос уже загруженных данных: данные остаются на экране, сверху — плашка с повтором.
 * Ошибка первой загрузки, когда показывать нечего, — `ErrorState`.
 */
export function RefreshErrorNotice({
  title,
  description = 'На экране — последние полученные данные.',
  onRetry,
}: Props) {
  return (
    <Alert
      type="warning"
      showIcon
      title={title}
      description={description}
      action={
        <Button size="small" onClick={onRetry}>
          Повторить
        </Button>
      }
    />
  )
}
