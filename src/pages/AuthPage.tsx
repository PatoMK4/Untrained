import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Screen = 'splash' | 'signin' | 'signup' | 'pending' | 'reset' | 'resetSent'

const C = {
  bg: '#050505', surf: '#131313', line: '#242424', line2: '#2e2e2e',
  fg: '#f4f4f3', fg2: '#c9c9c7', mute: '#8a8a86', mute2: '#5d5d5a',
  lime: '#c8ff00', red: '#ff4423',
}
const F = {
  disp: '"Barlow Condensed","Arial Narrow",sans-serif',
  mono: '"JetBrains Mono",ui-monospace,monospace',
  body: '"Barlow","Helvetica Neue",system-ui,sans-serif',
}

function Tag({ children, color = C.mute, style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.18em', color, textTransform: 'uppercase', ...style }}>
      {children}
    </div>
  )
}

function LimeBtn({ children, sub, onClick, loading }: { children: React.ReactNode; sub?: string; onClick: () => void; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      background: loading ? C.mute2 : C.lime, color: '#0a0a0a', border: 0, cursor: loading ? 'default' : 'pointer',
      padding: '18px 20px', borderRadius: 2, width: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: F.disp, fontWeight: 700, fontSize: 26,
      letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>
      <span>{loading ? '...' : children}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {sub && <span style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 11, opacity: 0.7, letterSpacing: '0.1em' }}>{sub}</span>}
        <svg width="22" height="14" viewBox="0 0 22 14"><path d="M0 7h20M14 1l6 6-6 6" stroke="#0a0a0a" strokeWidth="2" fill="none"/></svg>
      </span>
    </button>
  )
}

function SocialBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, background: 'transparent', border: '1px solid ' + C.line2,
      color: C.fg, padding: '14px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: F.disp, fontSize: 18, fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase', borderRadius: 2,
    }}>{label}</button>
  )
}

function Field({ label, value, onChange, type = 'text', caret, trailing, onKeyDown }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; caret?: boolean; trailing?: React.ReactNode
  onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Tag>{label}</Tag>
        {trailing}
      </div>
      <div style={{ marginTop: 8, paddingBottom: 10, borderBottom: '1px solid ' + C.line2, display: 'flex', alignItems: 'center' }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          style={{
            flex: 1, background: 'transparent', border: 0, outline: 'none',
            fontFamily: F.body, fontSize: 22, color: C.fg, letterSpacing: '-0.005em',
          }}
          autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
        />
        {caret && (
          <span style={{
            display: 'inline-block', width: 2, height: 22, background: C.lime, marginLeft: 3,
            animation: 'ut-pulse 1.1s steps(1) infinite',
          }} />
        )}
      </div>
    </div>
  )
}

function PasswordStrength({ score }: { score: number }) {
  const labels = ['', 'WEAK', 'FAIR', 'GOOD', 'STRONG', 'STRONG']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -8 }}>
      <div style={{ display: 'flex', gap: 3, flex: 1 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, background: i < score ? C.lime : C.line2 }} />
        ))}
      </div>
      {score > 0 && <span style={{ fontFamily: F.mono, fontSize: 10, color: C.lime, letterSpacing: '0.14em' }}>{labels[score]}</span>}
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '12px 14px', border: '1px solid ' + C.red, borderRadius: 2 }}>
      <span style={{ fontFamily: F.mono, fontSize: 11, color: C.red, letterSpacing: '0.08em' }}>{msg.toUpperCase()}</span>
    </div>
  )
}

function calcStrength(p: string) {
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return Math.min(5, s + (p.length >= 12 ? 1 : 0))
}

export function AuthPage() {
  const navigate = useNavigate()
  const [screen, setScreen] = useState<Screen>('splash')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setError(null)
    if (!email.trim()) { setError('Enter your email address.'); return }
    if (!password) { setError('Enter your password.'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (e) {
      setError(e.message.toLowerCase().includes('invalid') ? 'Wrong email or password.' : e.message)
      return
    }
    navigate('/', { replace: true })
  }

  const handleSignUp = async () => {
    setError(null)
    if (!email.trim()) { setError('Enter your email.'); return }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
      },
    })
    setLoading(false)
    if (e) { setError(e.message); return }
    setScreen('pending')
  }

  const handleGoogle = async () => {
    setError(null); setGoogleLoading(true)
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (e) { setError(e.message); setGoogleLoading(false) }
  }

  const handleReset = async () => {
    setError(null)
    if (!resetEmail.trim()) { setError('Enter your email.'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setLoading(false)
    if (e) { setError(e.message); return }
    setScreen('resetSent')
  }

  // ── SPLASH ──────────────────────────────────────────────────────────────────
  if (screen === 'splash') {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', padding: '68px 24px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, background: C.lime, borderRadius: '50%' }} />
            <Tag color={C.lime}>SYSTEM READY</Tag>
          </div>
          <Tag>UT—001 · v 1.0</Tag>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <Tag style={{ fontSize: 9 }}>EST · 2026 · BUILD 1.0.0</Tag>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </div>

        <div style={{ marginTop: 46 }}>
          <Tag>TRAIN BY DESIGN ·</Tag>
          <div style={{ fontFamily: F.disp, fontSize: 84, fontWeight: 800, color: C.fg, lineHeight: 0.92, letterSpacing: '-0.035em', marginTop: 8 }}>
            UNTRAINED.
          </div>
          <div style={{ fontFamily: F.body, fontSize: 17, color: C.fg2, lineHeight: 1.5, marginTop: 14 }}>
            A coach in your pocket.<br/>Built for the work, not the feed.
          </div>
        </div>

        <div style={{ marginTop: 28, borderTop: '1px solid ' + C.line, borderBottom: '1px solid ' + C.line, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {([['TRACK', 'EVERY REP'], ['COACH', 'ALWAYS ON'], ['DATA', 'YOURS'], ['WORK', 'DAILY']] as [string, string][]).map(([k, v], i) => (
            <div key={k} style={{
              padding: '16px 14px 16px 0',
              borderBottom: i < 2 ? '1px solid ' + C.line : 'none',
              borderRight: i % 2 === 0 ? '1px solid ' + C.line : 'none',
              paddingLeft: i % 2 === 1 ? 14 : 0,
            }}>
              <Tag color={C.mute}>{k}</Tag>
              <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 600, color: C.fg, marginTop: 6, letterSpacing: '0.02em' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
          <div>
            <Tag>TODAY · DAY 01 · MON</Tag>
            <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 600, color: C.fg, marginTop: 6, letterSpacing: '0.02em' }}>PUSH · 52 MIN</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontFamily: F.disp, fontSize: 38, fontWeight: 800, color: C.lime, lineHeight: 1, letterSpacing: '-0.01em' }}>92</span>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.mute }}>READINESS</span>
          </div>
        </div>

        <LimeBtn sub="EMAIL · APPLE · GOOGLE" onClick={() => setScreen('signup')}>BEGIN</LimeBtn>
        <button onClick={() => setScreen('signin')} style={{
          background: 'transparent', border: 0, color: C.fg2, cursor: 'pointer',
          fontFamily: F.mono, fontSize: 11, letterSpacing: '0.16em', padding: '14px 0 0',
          textTransform: 'uppercase', textAlign: 'left',
        }}>I already have an account →</button>
        <div style={{ height: 30 }} />
      </div>
    )
  }

  // ── PENDING VERIFICATION ────────────────────────────────────────────────────
  if (screen === 'pending') {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', padding: '72px 24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, background: C.lime, borderRadius: '50%' }} />
            <Tag color={C.lime}>CHECK EMAIL</Tag>
          </div>
          <Tag>UT—003</Tag>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontFamily: F.disp, fontSize: 72, fontWeight: 800, color: C.fg, lineHeight: 0.92, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            ALMOST<br/>THERE.
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.1em', lineHeight: 1.8 }}>
            LINK SENT TO<br/><span style={{ color: C.fg }}>{email}</span>
          </div>
        </div>
        <button onClick={() => { setScreen('signin'); setPassword('') }} style={{
          background: 'transparent', border: 0, color: C.mute, cursor: 'pointer',
          fontFamily: F.mono, fontSize: 11, letterSpacing: '0.16em', padding: '14px 0',
          textTransform: 'uppercase', textAlign: 'left',
        }}>← I already have an account</button>
      </div>
    )
  }

  // ── RESET SENT ──────────────────────────────────────────────────────────────
  if (screen === 'resetSent') {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', padding: '72px 24px 32px' }}>
        <button onClick={() => setScreen('signin')} style={{ fontFamily: F.mono, fontSize: 11, color: C.fg2, letterSpacing: '0.16em', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 48 }}>← BACK</button>
        <div style={{ fontFamily: F.disp, fontSize: 64, fontWeight: 800, color: C.fg, lineHeight: 0.92, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>CHECK<br/>EMAIL.</div>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.1em', marginTop: 16 }}>LINK SENT TO {resetEmail}.</div>
      </div>
    )
  }

  // ── RESET ───────────────────────────────────────────────────────────────────
  if (screen === 'reset') {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', padding: '72px 24px 32px' }}>
        <button onClick={() => { setScreen('signin'); setError(null) }} style={{ fontFamily: F.mono, fontSize: 11, color: C.fg2, letterSpacing: '0.16em', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 48 }}>← BACK</button>
        <Tag>RESET PASSWORD</Tag>
        <div style={{ fontFamily: F.disp, fontSize: 64, fontWeight: 800, color: C.fg, lineHeight: 0.92, letterSpacing: '-0.02em', textTransform: 'uppercase', marginTop: 8, marginBottom: 40 }}>
          FORGOT?<br/>NO SWEAT.
        </div>
        {error && <ErrorBox msg={error} />}
        <Field label="EMAIL" value={resetEmail} onChange={setResetEmail} type="email" />
        <div style={{ flex: 1, minHeight: 40 }} />
        <LimeBtn sub="EMAIL" onClick={handleReset} loading={loading}>SEND LINK</LimeBtn>
      </div>
    )
  }

  // ── SIGN IN ─────────────────────────────────────────────────────────────────
  if (screen === 'signin') {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', padding: '72px 24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setScreen('splash')} style={{ fontFamily: F.mono, fontSize: 11, color: C.fg2, letterSpacing: '0.16em', background: 'none', border: 'none', cursor: 'pointer' }}>← BACK</button>
          <Tag>UT—002</Tag>
        </div>

        <div style={{ marginTop: 48 }}>
          <Tag>RETURNING</Tag>
          <div style={{ fontFamily: F.disp, fontSize: 64, fontWeight: 700, color: C.fg, lineHeight: 0.92, letterSpacing: '-0.01em', textTransform: 'uppercase', marginTop: 8 }}>
            Welcome<br/>back.
          </div>
        </div>

        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && <ErrorBox msg={error} />}
          <Field label="EMAIL" value={email} onChange={setEmail} type="email" onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
          <Field
            label="PASSWORD"
            value={password}
            onChange={setPassword}
            type="password"
            caret
            trailing={
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.lime, letterSpacing: '0.1em', cursor: 'pointer' }}>SHOW</span>
            }
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 14, height: 14, border: '1px solid ' + C.line2, background: C.lime, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 16 16"><path d="M1 8l4 4 10-10" stroke="#0a0a0a" strokeWidth="2" fill="none"/></svg>
              </div>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.fg2, letterSpacing: '0.1em' }}>KEEP ME IN</span>
            </div>
            <button onClick={() => { setResetEmail(email); setScreen('reset'); setError(null) }} style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer' }}>FORGOT?</button>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <SocialBtn label="APPLE" onClick={() => {}} />
            <SocialBtn label={googleLoading ? '...' : 'GOOGLE'} onClick={handleGoogle} />
          </div>
          <LimeBtn sub="EMAIL" onClick={handleSignIn} loading={loading}>CONTINUE</LimeBtn>
          <button onClick={() => { setScreen('signup'); setError(null) }} style={{ background: 'transparent', border: 0, color: C.fg2, cursor: 'pointer', fontFamily: F.mono, fontSize: 11, letterSpacing: '0.16em', padding: '10px 0', textTransform: 'uppercase', textAlign: 'left' }}>
            Don't have an account →
          </button>
        </div>
        <div style={{ height: 30 }} />
      </div>
    )
  }

  // ── CREATE ACCOUNT ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', padding: '72px 24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => { setScreen('splash'); setError(null) }} style={{ fontFamily: F.mono, fontSize: 11, color: C.fg2, letterSpacing: '0.16em', background: 'none', border: 'none', cursor: 'pointer' }}>← BACK</button>
        <Tag>UT—003 · NEW</Tag>
      </div>

      <div style={{ marginTop: 40 }}>
        <Tag>STEP 00 / 06</Tag>
        <div style={{ fontFamily: F.disp, fontSize: 64, fontWeight: 700, color: C.fg, lineHeight: 0.92, letterSpacing: '-0.01em', textTransform: 'uppercase', marginTop: 8 }}>
          Make your<br/>account.
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.06em', marginTop: 14, lineHeight: 1.6 }}>
          ONE LOGIN ACROSS PHONE,<br/>WATCH AND BROWSER.
        </div>
      </div>

      <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && <ErrorBox msg={error} />}
        <Field label="NAME" value={name} onChange={setName} type="text" />
        <Field label="EMAIL" value={email} onChange={setEmail} type="email" onKeyDown={e => e.key === 'Enter' && handleSignUp()} />
        <Field label="CREATE PASSWORD" value={password} onChange={setPassword} type="password" caret onKeyDown={e => e.key === 'Enter' && handleSignUp()} />
        <PasswordStrength score={calcStrength(password)} />
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 14, height: 14, marginTop: 1, border: '1px solid ' + C.line2, background: C.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 16 16"><path d="M1 8l4 4 10-10" stroke="#0a0a0a" strokeWidth="2" fill="none"/></svg>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.fg2, letterSpacing: '0.06em', lineHeight: 1.7 }}>
          I AGREE TO THE TERMS &amp; PRIVACY POLICY.<br/>
          <span style={{ color: C.mute }}>AND TO TRAIN. ESPECIALLY ON THE DAYS I DON'T FEEL LIKE IT.</span>
        </div>
      </div>

      <LimeBtn sub="NEXT · GOALS" onClick={handleSignUp} loading={loading}>CREATE</LimeBtn>
      <button onClick={() => { setScreen('signin'); setError(null) }} style={{ background: 'transparent', border: 0, color: C.fg2, cursor: 'pointer', fontFamily: F.mono, fontSize: 11, letterSpacing: '0.16em', padding: '14px 0 0', textTransform: 'uppercase', textAlign: 'left' }}>
        I already have an account →
      </button>
      <div style={{ height: 30 }} />
    </div>
  )
}
