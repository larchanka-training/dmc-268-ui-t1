import { Input, Switch } from 'antd'

import { useFilterFindings } from '../model/store'

/** Поиск файла по подстроке пути и переключатель «Только с замечаниями». */
export function FileFilter() {
  const { file_query, only_with_findings, setFileQuery, setOnlyWithFindings } = useFilterFindings()

  return (
    <div role="group" aria-label="Фильтр файлов" className="space-y-2 pb-2">
      <Input
        allowClear
        size="small"
        aria-label="Поиск по пути файла"
        placeholder="Путь файла"
        value={file_query}
        onChange={(event) => setFileQuery(event.target.value)}
      />
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <Switch size="small" checked={only_with_findings} onChange={setOnlyWithFindings} />
        Только с замечаниями
      </label>
    </div>
  )
}
