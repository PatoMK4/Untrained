import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
})

// Bootstrap auth before render — reads persisted session from localStorage
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session)
  useAuthStore.getState().setUser(session?.user ?? null)
  useAuthStore.getState().setLoading(false)
})

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session)
  useAuthStore.getState().setUser(session?.user ?? null)
})

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
