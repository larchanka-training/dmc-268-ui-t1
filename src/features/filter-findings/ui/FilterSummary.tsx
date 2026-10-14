import { Button } from 'antd'

import { hasActiveFilters, useFilterFindings } from '../model/store'

type Props = {
  shown: number
  total: number
  /** Кнопка сброса не нужна там, где экран уже предлагает её сам (пустое состояние). */
  withReset?: boolean
}

/** «Показано N из M» и сброс всех фильтров одним действием. */
export function FilterSummary({ shown, total, withReset = true }: Props) {
  const filters = useFilterFindings()

  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span>
        Показано замечаний: {shown} из {total}
      </span>
      {withReset && hasActiveFilters(filters) && (
        <Button size="small" type="link" onClick={filters.resetFilters} className="text-xs">
          Сбросить фильтры
        </Button>
      )}
    </div>
  )
}
