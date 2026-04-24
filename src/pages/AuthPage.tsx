import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wordmark } from '@/components/ui/Wordmark'
import { Button } from '@/components/ui/Button'

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      console.error(error)
      setGoogleLoading(false)
    }
    // No need to setGoogleLoading(false) on success — page will redirect
  }

  const handleEmailLogin = async () => {
    if (!email) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (!error) setSent(true)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-8">
      <div className="flex flex-col items-center gap-2">
        <Wordmark size="xl" />
        <p className="text-text-disabled text-sm tracking-widest">
          TRAIN. PROGRESS. REPEAT.
        </p>
      </div>

      {!sent ? (
        <div className="w-full max-w-sm flex flex-col gap-3">
          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full h-12 bg-white rounded-pill flex items-center justify-center gap-3
              font-bold text-sm text-gray-800 active:brightness-95 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <span className="animate-spin text-gray-600">◌</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-surface-raised" />
            <span className="text-text-disabled text-xs">or</span>
            <div className="flex-1 h-px bg-surface-raised" />
          </div>

          {/* Email magic link — collapsed by default */}
          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              className="text-text-disabled text-sm text-center py-2 underline"
            >
              Sign in with email instead
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoFocus
                className="w-full h-12 bg-surface rounded-card px-4 text-text-primary
                  border border-text-disabled focus:border-accent outline-none"
              />
              <Button fullWidth loading={loading} onClick={handleEmailLogin}>
                SEND MAGIC LINK
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center flex flex-col gap-3">
          <p className="text-text-primary font-bold text-lg">Check your email.</p>
          <p className="text-text-secondary text-sm">
            We sent a magic link to {email}
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-text-disabled text-xs underline mt-2"
          >
            Wrong email? Go back
          </button>
        </div>
      )}
    </div>
  )
}