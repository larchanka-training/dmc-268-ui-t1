import { Navigate, type RouteObject } from 'react-router'

import { ReviewRunPage } from '../../pages/review-run'
import { EmptyState } from '../../shared/ui'
import { DEMO_RUN_ID } from '../mocks/fixtures'

export const routes: RouteObject[] = [
  // Списка прогонов в этой версии нет (§1.3): корень ведёт на демонстрационный прогон.
  { path: '/', element: <Navigate to={`/review-runs/${DEMO_RUN_ID}`} replace /> },
  { path: '/review-runs/:runId', element: <ReviewRunPage /> },
  {
    path: '*',
    element: (
      <main className="mx-auto max-w-3xl p-6">
        <EmptyState>Страница не найдена.</EmptyState>
      </main>
    ),
  },
]
