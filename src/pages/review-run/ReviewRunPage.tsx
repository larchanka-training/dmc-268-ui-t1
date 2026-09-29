import { useQuery } from '@tanstack/react-query'
import { getMockReview } from '../../app/mocks/reviewApi'
import { ReviewWorkspace } from '../../widgets/review-workspace/ReviewWorkspace'
import { RunInspector } from '../../widgets/run-inspector/RunInspector'

export function ReviewRunPage() {
  const query = useQuery({ queryKey: ['mock-review', 'run-42'], queryFn: getMockReview })
  if (query.isPending) return <p>Загрузка прогона…</p>
  if (query.isError) return <p role="alert">Не удалось загрузить данные прогона.</p>
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Прогон ревью</h1>
        <p>
          Статус: {query.data.run.status} · {query.data.run.headSha}
        </p>
      </header>
      <ReviewWorkspace review={query.data} />
      <RunInspector actions={query.data.actions} />
    </main>
  )
}
