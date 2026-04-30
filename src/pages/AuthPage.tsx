// src/pages/AuthPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Wordmark } from '@/components/ui/Wordmark'
import { Button } from '@/components/ui/Button'

type AuthMode = 'signin' | 'signup'

export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handleEmailAuth = async () => {
    setError(null)
    if (!email.trim()) { setError('Please enter your email address.'); return }
    if (!password) { setError('Please enter your password.'); return }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }
      navigate('/', { replace: true })
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) {
        setError(
          signInError.message.toLowerCase().includes('invalid') ||
          signInError.message.toLowerCase().includes('credentials')
            ? 'Wrong email or password. Try again or reset your password below.'
            : signInError.message
        )
        setLoading(false)
        return
      }
      navigate('/', { replace: true })
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError(null)
    setGoogleLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (oauthError) { setError(oauthError.message); setGoogleLoading(false) }
  }

  const handlePasswordReset = async () => {
    setError(null)
    if (!resetEmail.trim()) { setError('Enter your email address.'); return }
    setResetLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim(),
      { redirectTo: `${window.location.origin}/reset-password` }
    )
    setResetLoading(false)
    if (resetError) { setError(resetError.message); return }
    setResetSent(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEmailAuth()
  }

  if (showReset) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-8">
        <Wordmark size="xl" />
        {resetSent ? (
          <div className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
            <p className="text-5xl">✉️</p>
            <p className="text-text-primary font-bold text-xl">Check your email.</p>
            <p className="text-text-secondary text-sm">
              We sent a reset link to {resetEmail}.
            </p>
            <button
              onClick={() => { setShowReset(false); setResetSent(false); setResetEmail('') }}
              className="text-accent text-sm font-bold min-h-[44px] px-4"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black text-text-primary">Reset password</h1>
              <p className="text-text-secondary text-sm">
                We'll send a reset link to your email.
              </p>
            </div>
            {error && (
              <div className="p-3 bg-surface border border-red-500 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              className="w-full h-12 bg-surface rounded-xl px-4 text-text-primary
                border border-surface-raised focus:border-accent outline-none text-base"
            />
            <Button fullWidth loading={resetLoading} onClick={handlePasswordReset}>
              SEND RESET LINK
            </Button>
            <button
              onClick={() => { setShowReset(false); setError(null) }}
              className="text-text-secondary text-sm min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-8">
      <div className="flex flex-col items-center gap-2">
        <Wordmark size="xl" />
        <p className="text-text-disabled text-sm tracking-widest">TRAIN. PROGRESS. REPEAT.</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {error && (
          <div className="p-3 bg-surface border border-red-500 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full h-12 bg-white rounded-pill flex items-center justify-center gap-3
            font-bold text-sm text-gray-800 active:brightness-95 transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <span className="animate-spin text-gray-500">◌</span>
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

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-surface-raised" />
          <span className="text-text-disabled text-xs">or</span>
          <div className="flex-1 h-px bg-surface-raised" />
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Email address"
          autoComplete="email"
          className="w-full h-12 bg-surface rounded-xl px-4 text-text-primary
            border border-surface-raised focus:border-accent outline-none text-base"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'signup' ? 'Create a password (min 6 chars)' : 'Password'}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="w-full h-12 bg-surface rounded-xl px-4 text-text-primary
            border border-surface-raised focus:border-accent outline-none text-base"
        />

        {mode === 'signin' && (
          <button
            onClick={() => { setShowReset(true); setResetEmail(email); setError(null) }}
            className="text-text-secondary text-sm text-right -mt-2 min-h-[44px]
              flex items-center justify-end"
          >
            Forgot password?
          </button>
        )}

        <Button fullWidth loading={loading} onClick={handleEmailAuth}>
          {mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
        </Button>

        <div className="flex items-center justify-center gap-1">
          <span className="text-text-secondary text-sm">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
            className="text-accent text-sm font-bold min-h-[44px] px-2"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}