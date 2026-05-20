import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

const C = {
  bg: '#050505', bg2: '#0c0c0c', surf: '#131313', surf2: '#1a1a1a',
  line: '#242424', line2: '#2e2e2e',
  fg: '#f4f4f3', fg2: '#c9c9c7', mute: '#8a8a86', mute2: '#5d5d5a',
  lime: '#c8ff00',
}
const F = {
  disp: '"Barlow Condensed","Arial Narrow",sans-serif',
  mono: '"JetBrains Mono",ui-monospace,monospace',
  body: '"Barlow","Helvetica Neue",system-ui,sans-serif',
}

interface Msg { role: 'user' | 'coach'; text: string; time: string }

const STARTERS = [
  'How should I progress on bench this week?',
  'I skipped legs yesterday — adjust?',
  'What should my RPE be today?',
  'Shoulders are a bit tight — swap anything?',
]

const MOCK_REPLIES: Record<string, string> = {
  default: "I'm looking at your recent sessions. Keep your effort around RPE 7–8 today and focus on form over load.",
}

export default function CoachPage() {
  const { user } = useAuthStore()
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'coach',
      text: "Ready when you are. Ask me about your program, form, fatigue, or anything training-related.",
      time: 'NOW',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const sendMsg = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Msg = { role: 'user', text: text.trim(), time: 'NOW' }
    setMsgs(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { message: text.trim(), userId: user?.id },
      })
      const reply = (!error && data?.reply) ? data.reply : MOCK_REPLIES.default
      setMsgs(prev => [...prev, { role: 'coach', text: reply, time: 'NOW' }])
    } catch {
      setMsgs(prev => [...prev, { role: 'coach', text: MOCK_REPLIES.default, time: 'NOW' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '68px 24px 20px', borderBottom: '1px solid ' + C.line }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.16em', color: C.mute, textTransform: 'uppercase' }}>COACH</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.lime }} />
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.lime, letterSpacing: '0.12em' }}>MARLO · ONLINE</span>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 36, color: C.fg, textTransform: 'uppercase', lineHeight: 0.92 }}>Ask Marlo.</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, letterSpacing: '0.06em', marginTop: 6 }}>ADAPTIVE · STRENGTH-FOCUSED · DIRECT</div>
        </div>
      </div>

      {/* Quick starters */}
      {msgs.length <= 1 && (
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, letterSpacing: '0.16em', marginBottom: 10 }}>QUICK START</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STARTERS.map(s => (
              <button key={s} onClick={() => sendMsg(s)} style={{
                background: 'transparent', border: '1px solid ' + C.line2,
                padding: '12px 14px', textAlign: 'left',
                fontFamily: F.body, fontSize: 14, color: C.fg2, cursor: 'pointer',
                borderRadius: 2,
              }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 0' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12,
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 16,
          }}>
            {m.role === 'coach' && (
              <div style={{
                width: 32, height: 32, background: C.lime, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F.disp, fontSize: 20, fontWeight: 800, color: '#0a0a0a', borderRadius: 2,
              }}>M</div>
            )}
            <div style={{
              maxWidth: '78%',
              background: m.role === 'user' ? C.surf2 : C.surf,
              border: '1px solid ' + (m.role === 'user' ? C.line2 : C.line),
              padding: '12px 14px', borderRadius: 2,
            }}>
              {m.role === 'coach' && (
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: '0.12em', marginBottom: 6 }}>MARLO</div>
              )}
              <div style={{ fontFamily: F.body, fontSize: 14, color: C.fg, lineHeight: 1.5 }}>{m.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: C.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.disp, fontSize: 20, fontWeight: 800, color: '#0a0a0a', borderRadius: 2 }}>M</div>
            <div style={{ background: C.surf, border: '1px solid ' + C.line, padding: '12px 14px', borderRadius: 2 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: C.lime, opacity: 0.6, animation: `ut-pulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 24px 120px', borderTop: '1px solid ' + C.line }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMsg(input))}
            placeholder="Ask anything about your training…"
            style={{
              flex: 1, background: C.surf, border: '1px solid ' + C.line2,
              color: C.fg, padding: '14px 16px',
              fontFamily: F.body, fontSize: 14, outline: 'none', borderRadius: 2,
            }}
          />
          <button
            onClick={() => sendMsg(input)}
            disabled={!input.trim() || loading}
            style={{
              background: input.trim() ? C.lime : C.line2,
              border: 0, padding: '14px 18px', cursor: input.trim() ? 'pointer' : 'default',
              fontFamily: F.disp, fontWeight: 700, fontSize: 16,
              color: input.trim() ? '#0a0a0a' : C.mute,
              letterSpacing: '0.04em', textTransform: 'uppercase', borderRadius: 2,
              transition: 'background 0.15s',
            }}
          >
            <svg width="18" height="12" viewBox="0 0 18 12">
              <path d="M0 6h16M10 1l6 5-6 5" stroke={input.trim() ? '#0a0a0a' : C.mute} strokeWidth="2" fill="none"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
