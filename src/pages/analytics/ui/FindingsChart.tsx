import { Column } from '@ant-design/charts'

import { useAppTheme } from '@/features/theme'
import { formatNumber, formatShortUtcDay } from '@/shared/lib'

import type { FindingsPoint } from '../model/series'

/** Замечания по UTC-дням, столбцы сложены по категориям. */
export function FindingsChart({ data }: { data: FindingsPoint[] }) {
  const { mode } = useAppTheme()
  return (
    <div role="img" aria-label="Замечания по дням и категориям">
      <Column
        data={data}
        xField="date"
        yField="count"
        colorField="category"
        stack
        height={320}
        theme={mode === 'dark' ? 'classicDark' : 'classic'}
        axis={{
          x: { labelFormatter: formatShortUtcDay },
          y: {
            title: 'Замечаний',
            labelFormatter: (value: number) => formatNumber(value),
            tickFilter: (value: number) => Number.isInteger(value),
          },
        }}
      />
    </div>
  )
}
