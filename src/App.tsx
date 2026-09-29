import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewRunPage } from './pages/review-run/ReviewRunPage'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReviewRunPage />
    </QueryClientProvider>
  )
}

export default App
