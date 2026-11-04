import { Tag } from 'antd'

import { SERVICE_STATUS_LABELS } from '../model/labels'
import type { ServiceStatus } from '../model/schema'

/** Цвета тегов antd: тема (светлая и тёмная) перекрашивает их сама. */
const STATUS_COLOR: Record<ServiceStatus, string> = {
  operational: 'success',
  degraded: 'warning',
  outage: 'error',
  unknown: 'default',
}

/** Состояние словом, а не только цветом. */
export function ServiceStatusTag({ status }: { status: ServiceStatus }) {
  return (
    <Tag color={STATUS_COLOR[status]} className="m-0">
      {SERVICE_STATUS_LABELS[status]}
    </Tag>
  )
}
