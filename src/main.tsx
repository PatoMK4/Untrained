import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
})

// Rehydrate auth state from Supabase session before mounting
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({
    user: session?.user ?? null,
    session,
    loading: false,
  })
})

// Keep auth store in sync with Supabase auth events
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({
    user: session?.user ?? null,
    session,
    loading: false,
  })
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)