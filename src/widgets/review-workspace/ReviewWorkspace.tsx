import { useEffect } from 'react'
import { Checkbox, Field, Label } from '@headlessui/react'
import type { DiffLine, ReviewFinding, ReviewState, Severity } from '../../entities/review/model'
import { useWorkspaceStore } from './model/store'

const severities: Severity[] = ['low', 'medium', 'high', 'critical']
const lineNumber = (line: DiffLine) => (line.kind === 'removed' ? line.oldLine : line.newLine)
function findingFor(line: DiffLine, findings: ReviewFinding[]) {
  return line.kind === 'context'
    ? undefined
    : findings.find(
        (finding) =>
          finding.side === (line.kind === 'added' ? 'new' : 'old') &&
          (line.kind === 'added' ? finding.newLine : finding.oldLine) === lineNumber(line),
      )
}

export function ReviewWorkspace({ review }: { review: ReviewState }) {
  const { selectedFile, severities: active, selectFile, toggleSeverity } = useWorkspaceStore()
  const path =
    selectedFile && review.diffsByPath[selectedFile] ? selectedFile : review.files[0]?.path
  useEffect(() => {
    if (path && selectedFile !== path) selectFile(path)
  }, [path, selectedFile, selectFile])
  if (!path) return <p>В прогоне нет изменённых файлов.</p>
  const diff = review.diffsByPath[path]
  const findings = review.findings.filter((finding) => active.includes(finding.severity))
  return (
    <section aria-label="Рабочая область ревью" className="grid gap-6 md:grid-cols-[13rem_1fr]">
      <aside>
        <FileList files={review.files} selectedPath={path} onSelect={selectFile} />
        <fieldset>
          <legend>Важность</legend>
          {severities.map((severity) => (
            <Field key={severity} className="flex gap-2">
              <Checkbox
                checked={active.includes(severity)}
                onChange={() => toggleSeverity(severity)}
                className="size-4 border data-[checked]:bg-blue-600"
              />
              <Label className="capitalize">{severity}</Label>
            </Field>
          ))}
        </fieldset>
      </aside>
      <DiffViewer path={diff.path} lines={diff.lines} findings={findings} />
    </section>
  )
}

export function FileList({
  files,
  selectedPath,
  onSelect,
}: {
  files: ReviewState['files']
  selectedPath: string
  onSelect: (path: string) => void
}) {
  return (
    <>
      <h2 className="font-semibold">Файлы</h2>
      <ul>
        {files.map((file) => (
          <li key={file.path}>
            <button
              type="button"
              aria-pressed={selectedPath === file.path}
              onClick={() => onSelect(file.path)}
            >
              {file.path}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

export function DiffViewer({
  path,
  lines,
  findings,
}: {
  path: string
  lines: DiffLine[]
  findings: ReviewFinding[]
}) {
  return (
    <section>
      <h2>{path}</h2>
      <DiffHunk lines={lines} findings={findings} />
    </section>
  )
}

export function DiffHunk({ lines, findings }: { lines: DiffLine[]; findings: ReviewFinding[] }) {
  return (
    <pre>
      <p>@@ изменения @@</p>
      {lines.map((line) => (
        <DiffLine key={line.id} line={line} finding={findingFor(line, findings)} />
      ))}
    </pre>
  )
}

export function DiffLine({ line, finding }: { line: DiffLine; finding?: ReviewFinding }) {
  return (
    <div>
      <code>
        {String(lineNumber(line) ?? '').padStart(3)}{' '}
        {line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' '} {line.content}
      </code>
      {finding && <ReviewCommentThread finding={finding} />}
    </div>
  )
}

export function ReviewCommentThread({ finding }: { finding: ReviewFinding }) {
  return <p role="note">{finding.message}</p>
}
