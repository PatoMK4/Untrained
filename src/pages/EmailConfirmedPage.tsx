// src/pages/EmailConfirmedPage.tsx
import { useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/ui/Wordmark'
import { Button } from '@/components/ui/Button'

export function EmailConfirmedPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-8 text-center">
      <Wordmark size="xl" />
      <div className="flex flex-col gap-3">
        <p className="text-5xl">✅</p>
        <h1 className="text-3xl font-black text-text-primary">Email confirmed.</h1>
        <p className="text-text-secondary text-sm">
          Your account is ready. Sign in to get started.
        </p>
      </div>
      <Button fullWidth onClick={() => navigate('/auth', { replace: true })}>
        SIGN IN
      </Button>
    </div>
  )
}
