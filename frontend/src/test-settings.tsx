import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'react-redux'
import { store } from './store/store'
import TabbedSettingsPage from './pages/TabbedSettingsPage'
import './index.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

export function TestApp() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div style={{ padding: '20px' }}>
            <h1>Settings Test Page</h1>
            <TabbedSettingsPage />
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  )
}

createRoot(document.getElementById('root')!).render(<TestApp />)
