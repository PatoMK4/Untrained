import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

type AuthMode = 'signin' | 'signup'

const mono: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
}

const disp = (size: number, weight = 700): React.CSSProperties => ({
  fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
  fontWeight: weight,
  fontSize: size,
  lineHeight: 0.92,
  letterSpacing: '-0.01em',
})

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
  const [signupPending, setSignupPending] = useState(false)

  const handleEmailAuth = async () => {
    setError(null)
    if (!email.trim()) { setError('Enter your email address.'); return }
    if (!password) { setError('Enter your password.'); return }
    if (mode === 'signup' && password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    if (mode === 'signup') {
      const { error: e } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
      })
      setLoading(false)
      if (e) { setError(e.message); return }
      setSignupPending(true)
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (e) {
        setError(e.message.toLowerCase().includes('invalid') || e.message.toLowerCase().includes('credentials')
          ? 'Wrong email or password.' : e.message)
        setLoading(false); return
      }
      navigate('/', { replace: true })
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError(null); setGoogleLoading(true)
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (e) { setError(e.message); setGoogleLoading(false) }
  }

  const handlePasswordReset = async () => {
    setError(null)
    if (!resetEmail.trim()) { setError('Enter your email address.'); return }
    setResetLoading(true)
    const { error: e } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setResetLoading(false)
    if (e) { setError(e.message); return }
    setResetSent(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleEmailAuth() }

  if (signupPending) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col px-6 pt-16 pb-10">
        <MetaRow left="● CHECK EMAIL" leftLime right="UT—003" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          <div style={disp(72, 800)}>ALMOST<br />THERE.</div>
          <div style={{ ...mono, color: '#8a8a86', lineHeight: 1.8 }}>
            Link sent to<br /><span style={{ color: '#f4f4f3' }}>{email}</span>
          </div>
        </div>
        <button onClick={() => { setSignupPending(false); setMode('signin') }}
          style={{ ...mono, color: '#8a8a86', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44 }}>
          ← I already have an account
        </button>
      </div>
    )
  }

  if (showReset) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col px-6 pt-16 pb-10">
        <div style={{ marginBottom: 40 }}>
          <button onClick={() => { setShowReset(false); setError(null) }}
            style={{ ...mono, color: '#c9c9c7', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44 }}>
            ← BACK
          </button>
        </div>
        {resetSent ? (
          <>
            <div style={disp(56, 800)}>CHECK<br />EMAIL.</div>
            <div style={{ ...mono, color: '#8a8a86', marginTop: 16 }}>Link sent to {resetEmail}.</div>
          </>
        ) : (
          <>
            <div style={{ ...mono, color: '#8a8a86', marginBottom: 8 }}>RESET PASSWORD</div>
            <div style={{ ...disp(56, 800), marginBottom: 40 }}>FORGOT?<br />NO SWEAT.</div>
            {error && <ErrorBox message={error} />}
            <Field label="EMAIL" value={resetEmail} onChange={setResetEmail} type="email" />
            <div style={{ marginTop: 40 }}>
              <Button fullWidth size="lg" loading={resetLoading} onClick={handlePasswordReset} sub="EMAIL">
                SEND LINK
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col px-6 pt-16 pb-10">
      <MetaRow
        left="● SYSTEM READY"
        leftLime
        right={mode === 'signup' ? 'UT—003 · NEW' : 'UT—002'}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 40px' }}>
        <div style={{ flex: 1, height: 1, background: '#242424' }} />
        <span style={{ ...mono, fontSize: 9, color: '#5d5d5a' }}>EST · 2026 · BUILD 1.0.0</span>
        <div style={{ flex: 1, height: 1, background: '#242424' }} />
      </div>

      {mode === 'signin' ? (
        <>
          <div style={{ ...mono, color: '#8a8a86', marginBottom: 8 }}>RETURNING</div>
          <div style={disp(64, 700)}>Welcome<br />back.</div>
        </>
      ) : (
        <>
          <div style={{ ...mono, color: '#8a8a86', marginBottom: 8 }}>STEP 00 / 06</div>
          <div style={disp(64, 700)}>Make your<br />account.</div>
        </>
      )}

      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {error && <ErrorBox message={error} />}
        {mode === 'signup' && (
          <Field label="NAME" value="" onChange={() => {}} type="text" placeholder="Your name" />
        )}
        <Field label="EMAIL" value={email} onChange={setEmail} type="email" onKeyDown={handleKeyDown} />
        <Field
          label={mode === 'signup' ? 'CREATE PASSWORD' : 'PASSWORD'}
          value={password}
          onChange={setPassword}
          type="password"
          onKeyDown={handleKeyDown}
          caret
        />
        {mode === 'signin' && (
          <button
            onClick={() => { setShowReset(true); setResetEmail(email); setError(null) }}
            style={{ ...mono, color: '#5d5d5a', textAlign: 'right', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, marginTop: -12 }}
          >
            FORGOT?
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 40 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <SocialBtn label="APPLE" onClick={() => {}} />
          <SocialBtn label={googleLoading ? '...' : 'GOOGLE'} onClick={handleGoogle} />
        </div>
        <Button fullWidth size="lg" loading={loading} onClick={handleEmailAuth} sub="EMAIL">
          {mode === 'signup' ? 'CREATE' : 'CONTINUE'}
        </Button>
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
          style={{ ...mono, color: '#8a8a86', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44 }}
        >
          {mode === 'signin' ? "Don't have an account →" : 'I already have an account →'}
        </button>
      </div>
    </div>
  )
}

function MetaRow({ left, leftLime = false, right }: { left: string; leftLime?: boolean; right: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <span style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: leftLime ? '#c8ff00' : '#8a8a86',
      }}>{left}</span>
      <span style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5d5d5a',
      }}>{right}</span>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', caret = false, placeholder, onKeyDown,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; caret?: boolean; placeholder?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  return (
    <div>
      <div style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8a8a86',
        marginBottom: 8,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #2e2e2e' }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
          style={{
            flex: 1, background: 'transparent',
            fontFamily: '"Barlow", "Helvetica Neue", system-ui, sans-serif',
            fontSize: 22, color: '#f4f4f3', outline: 'none', border: 'none',
            letterSpacing: '-0.005em',
          }}
        />
        {caret && (
          <span className="ut-pulse" style={{ display: 'inline-block', width: 2, height: 22, background: '#c8ff00', marginLeft: 3 }} />
        )}
      </div>
    </div>
  )
}

function SocialBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, height: 48, background: 'transparent',
        border: '1px solid #2e2e2e', borderRadius: 2, cursor: 'pointer',
        fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
        fontSize: 18, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
        color: '#f4f4f3',
      }}
    >
      {label}
    </button>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ padding: '12px 14px', border: '1px solid rgba(255,68,35,0.4)', background: 'rgba(255,68,35,0.08)', borderRadius: 2 }}>
      <span style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11, letterSpacing: '0.06em', color: '#ff4423',
      }}>{message}</span>
    </div>
  )
}
