import { useState } from 'react'
import { useUserProfile } from '@/hooks/useWorkout'
import { useScore } from '@/hooks/useScore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

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

function tag(color = C.mute): React.CSSProperties {
  return { fontFamily: F.mono, fontSize: 10, letterSpacing: '0.18em', color, textTransform: 'uppercase' as const }
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { data: profile } = useUserProfile()
  const { data: score } = useScore()
  const queryClient = useQueryClient()
  const [signingOut, setSigningOut] = useState(false)

  const displayName = (profile as { full_name?: string } | undefined)?.full_name
    || (user?.user_metadata as Record<string, string> | undefined)?.full_name
    || user?.email?.split('@')[0]?.toUpperCase()
    || 'ATHLETE'

  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const sessions = (score?.total_score ?? 0) > 0 ? Math.floor((score?.total_score ?? 0) / 10) : 42
  const hours = Math.round(sessions * 0.9 * 10) / 10

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    queryClient.clear()
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, overflowY: 'auto', paddingBottom: 120 }}>
      <div style={{ padding: '68px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={tag()}>ME · MEMBER 0492</span>
          <span style={tag()}>⚙ SETTINGS</span>
        </div>

        {/* Avatar */}
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 92, height: 92, background: C.surf, border: '1px solid ' + C.line2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: F.disp, fontSize: 48, fontWeight: 700, color: C.fg, letterSpacing: '0.04em',
            position: 'relative', borderRadius: 2,
          }}>
            {initials}
            <div style={{
              position: 'absolute', bottom: -6, right: -6,
              background: C.lime, color: '#0a0a0a', padding: '2px 6px',
              fontFamily: F.mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
            }}>PRO</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 34, color: C.fg, textTransform: 'uppercase', lineHeight: 1 }}>
              {displayName}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.1em', marginTop: 8 }}>
              JOINED {new Date(user?.created_at ?? '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()} · {Math.floor((Date.now() - new Date(user?.created_at ?? '').getTime()) / 86400000)} DAYS
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ marginTop: 24, borderTop: '1px solid ' + C.line, borderBottom: '1px solid ' + C.line, display: 'flex' }}>
        {[
          ['SESSIONS', String(sessions)],
          ['HOURS', String(hours)],
          ['VOL · LB', '420K'],
          ['PRS', String(score?.level ?? 17)],
        ].map(([k, v], i, a) => (
          <div key={k} style={{ flex: 1, padding: '18px 12px', borderRight: i < a.length - 1 ? '1px solid ' + C.line : 'none' }}>
            <span style={tag()}>{k}</span>
            <div style={{ fontFamily: F.disp, fontSize: 28, fontWeight: 700, color: C.fg, marginTop: 4, letterSpacing: '-0.005em' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Body composition */}
      <div style={{ padding: '22px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={tag()}>BODY · TODAY</span>
          <span style={{ ...tag(C.lime), cursor: 'pointer' }}>+ LOG</span>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: C.line }}>
          {[
            ['WEIGHT', '174.2', 'LB', '−1.8'],
            ['BF EST', '14', '%', '−2'],
            ['SLEEP', '7.4', 'HR', '+0.6'],
          ].map(([k, v, u, d]) => (
            <div key={k} style={{ background: C.bg, padding: '14px 12px' }}>
              <span style={tag()}>{k}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
                <span style={{ fontFamily: F.disp, fontSize: 24, fontWeight: 700, color: C.fg }}>{v}</span>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.mute }}>{u}</span>
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: '0.08em', marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Coach */}
      <div style={{ padding: '22px 24px 0' }}>
        <span style={tag()}>YOUR COACH</span>
        <div style={{
          marginTop: 12, border: '1px solid ' + C.line, background: C.surf,
          padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center', borderRadius: 2,
        }}>
          <div style={{
            width: 50, height: 50, background: C.lime, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: F.disp, fontSize: 28, fontWeight: 800, color: '#0a0a0a', borderRadius: 2,
          }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 600, color: C.fg, letterSpacing: '0.03em' }}>MARLO</div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, letterSpacing: '0.08em', marginTop: 2 }}>
              ADAPTIVE · STRENGTH-FOCUSED · DIRECT
            </div>
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.fg2, letterSpacing: '0.1em' }}>SWAP →</span>
        </div>
      </div>

      {/* Preferences */}
      <div style={{ padding: '30px 24px 0' }}>
        <span style={tag()}>PREFERENCES</span>
        <div style={{ marginTop: 12 }}>
          {[
            ['PROGRAM', 'PUSH/PULL/LEGS · 4×/WK'],
            ['UNITS', 'POUNDS · LB'],
            ['REST TIMER', 'AUTO 90S'],
            ['HAPTICS', 'ON'],
            ['COACH VOICE', 'TERSE · ON'],
            ['WORKOUT MUSIC', 'OFF'],
          ].map(([k, v], i, a) => (
            <div key={k} style={{
              padding: '14px 0', borderBottom: i < a.length - 1 ? '1px solid ' + C.line : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontFamily: F.disp, fontSize: 18, fontWeight: 500, color: C.fg, letterSpacing: '0.03em' }}>{k}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.lime, letterSpacing: '0.08em' }}>{v}</span>
                <span style={{ fontFamily: F.mono, fontSize: 14, color: C.mute }}>›</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account */}
      <div style={{ padding: '30px 24px 0' }}>
        <span style={tag()}>ACCOUNT</span>
        <div style={{ marginTop: 12 }}>
          {[
            ['EXPORT MY DATA', ''],
            ['INTEGRATIONS', 'APPLE HEALTH · STRAVA'],
            ['SUBSCRIPTION', 'PRO · $12/MO'],
          ].map(([k, v]) => (
            <div key={k} style={{
              padding: '14px 0', borderBottom: '1px solid ' + C.line,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontFamily: F.disp, fontSize: 16, fontWeight: 500, color: C.fg, letterSpacing: '0.03em' }}>{k}</span>
              {v && <span style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.08em' }}>{v}</span>}
            </div>
          ))}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              width: '100%', padding: '14px 0', borderBottom: 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'transparent', border: 0, cursor: 'pointer',
            }}
          >
            <span style={{ fontFamily: F.disp, fontSize: 16, fontWeight: 500, color: C.red, letterSpacing: '0.03em' }}>
              {signingOut ? 'SIGNING OUT…' : 'SIGN OUT'}
            </span>
          </button>
        </div>
      </div>

      <div style={{ padding: '30px 24px 30px', textAlign: 'center' }}>
        <span style={tag()}>UNTRAINED · V 1.0.0</span>
      </div>
    </div>
  )
}
