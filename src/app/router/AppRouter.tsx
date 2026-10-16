import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth'
import { AppLayout } from '@/widgets/app-shell'
import { ConnectRepositoryPage } from '@/pages/ConnectRepositoryPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { RepositoriesPage } from '@/pages/RepositoriesPage'
import { ReviewRunView } from '@/pages/review-run'

export function AppRouter() {
  return (
    // Приложение живёт под `/app` (#25); вход — статичная `/login` вне SPA.
    <BrowserRouter basename="/app">
      <Routes>
        {/* Экран прогона из #19: публичный, как до интеграции с кабинетом. */}
        <Route path="/reviews/:reviewId" element={<ReviewRunView />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<OverviewPage />} />
          <Route path="/repositories" element={<RepositoriesPage />} />
          <Route path="/repositories/connect" element={<ConnectRepositoryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
