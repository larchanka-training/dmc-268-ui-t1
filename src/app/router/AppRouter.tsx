import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth'
import { AppLayout } from '@/widgets/app-shell'
import { ConnectRepositoryPage } from '@/pages/ConnectRepositoryPage'
import { LoginPage } from '@/pages/LoginPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { RepositoriesPage } from '@/pages/RepositoriesPage'
import { RepositorySettingsPage } from '@/pages/RepositorySettingsPage'
import { ReviewRunView } from '@/pages/review-run'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
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
          <Route path="/repositories/:repositoryId/settings" element={<RepositorySettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
