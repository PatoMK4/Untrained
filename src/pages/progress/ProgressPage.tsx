import { useMemo } from 'react'
import { useSessionHistory, useScore } from '@/hooks/useScore'
import { useAuthStore } from '@/stores/authStore'

const C = {
  bg: '#050505', surf: '#131313', line: '#242424', line2: '#2e2e2e',
  fg: '#f4f4f3', fg2: '#c9c9c7', mute: '#8a8a86', mute2: '#5d5d5a',
  lime: '#c8ff00',
}
const F = {
  disp: '"Barlow Condensed","Arial Narrow",sans-serif',
  mono: '"JetBrains Mono",ui-monospace,monospace',
}

function tag(color = C.mute) {
  return { fontFamily: F.mono, fontSize: 10, letterSpacing: '0.18em', color, textTransform: 'uppercase' as const }
}

function SparkLine({ pts }: { pts: number[] }) {
  const max = Math.max(...pts, 1)
  const w = 80, h = 22
  const path = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * w
    const y = h - (v / max) * h
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ marginTop: 6 }}>
      <path d={path} fill="none" stroke={C.lime} strokeWidth="1.4"/>
      <circle cx={(pts.length - 1) / (pts.length - 1) * w} cy={h - (pts[pts.length-1]/max)*h} r="2" fill={C.lime}/>
    </svg>
  )
}

function Heatmap({ sessionDates }: { sessionDates: Set<string> }) {
  const cells = Array.from({ length: 84 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (83 - i))
    return sessionDates.has(d.toISOString().split('T')[0]) ? 1 : 0
  })
  return (
    <div style={{ marginTop: 12, display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gap: 3 }}>
      {cells.map((v, i) => (
        <div key={i} style={{ aspectRatio: '1', background: v ? C.lime : C.line2 }}/>
      ))}
    </div>
  )
}

export default function ProgressPage() {
  const { user } = useAuthStore()
  const { data: historyRaw } = useSessionHistory()
  const { data: score } = useScore()

  const sessions = (historyRaw ?? []) as { date: string; total_sets: number; total_reps: number; score_awarded: number; session_type: string }[]

  // Group sessions into 12 weekly buckets (total_sets per week)
  const weeklyVolumes = useMemo(() => {
    const buckets = Array(12).fill(0)
    const now = new Date()
    sessions.forEach(s => {
      const daysAgo = Math.floor((now.getTime() - new Date(s.date + 'T12:00:00').getTime()) / 86400000)
      const weekIdx = Math.floor(daysAgo / 7)
      if (weekIdx >= 0 && weekIdx < 12) buckets[11 - weekIdx] += s.total_sets
    })
    return buckets
  }, [sessions])

  const maxVol = Math.max(...weeklyVolumes, 1)
  const thisWeek = weeklyVolumes[11]
  const lastWeek = weeklyVolumes[10]
  const avg4wk = Math.round(weeklyVolumes.slice(8).reduce((a, b) => a + b, 0) / 4)
  const vsLastWeekPct = lastWeek > 0
    ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
    : thisWeek > 0 ? 100 : 0

  const nonZeroWeeks = weeklyVolumes.filter(v => v > 0)
  const trendPct = nonZeroWeeks.length >= 2
    ? Math.round(((nonZeroWeeks[nonZeroWeeks.length - 1] - nonZeroWeeks[0]) / nonZeroWeeks[0]) * 100)
    : 0

  const sessionDates = useMemo(() => new Set(sessions.map(s => s.date)), [sessions])

  const sinceText = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
    : 'DAY ONE'

  // Most recent 5 sessions as milestones
  const milestones = useMemo(() => sessions.slice(0, 5).map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
    title: `${s.session_type.replace(/_/g, ' ').toUpperCase()} · ${s.total_sets} SETS`,
    badge: `+${s.score_awarded} PTS`,
    star: s.score_awarded >= 30,
  })), [sessions])

  // Score sparkline from recent session scores (oldest → newest)
  const scorePts = useMemo(() => {
    const pts = sessions.slice(0, 11).map(s => s.score_awarded).reverse()
    return pts.length >= 2 ? pts : [10, 18, 14, 22, 19, 28, 26, 34, 38, 42, 48]
  }, [sessions])

  const noData = sessions.length === 0

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, overflowY: 'auto', paddingBottom: 120 }}>
      <div style={{ padding: '68px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={tag()}>SINCE {sinceText} · {score?.total_sessions ?? sessions.length} SESSIONS</span>
          <span style={tag(C.fg2)}>↓ EXPORT</span>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 70, color: C.fg, lineHeight: 0.9, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            {noData ? "Let's\nget going." : trendPct > 0 ? `You're\n+${trendPct}% up.` : "Keep\nbuilding."}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.06em', marginTop: 8, lineHeight: 1.5 }}>
            TOTAL WEEKLY SETS · 12 WEEK TREND
          </div>
        </div>
      </div>

      {/* Volume chart */}
      <div style={{ padding: '22px 24px 0' }}>
        <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          {weeklyVolumes.map((v, i) => {
            const h = maxVol > 0 ? (v / maxVol) * 100 : 0
            const isLast = i === weeklyVolumes.length - 1
            return (
              <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                <div style={{ width: '100%', height: h + '%', background: isLast ? C.lime : C.fg, opacity: isLast ? 1 : (0.25 + i * 0.045) }}/>
                <div style={{ fontFamily: F.mono, fontSize: 8, color: isLast ? C.lime : C.mute, letterSpacing: '0.08em' }}>W{(i+1).toString().padStart(2,'0')}</div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
          <div>
            <span style={tag()}>THIS WK</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontFamily: F.disp, fontSize: 30, fontWeight: 700, color: C.lime }}>{thisWeek}</span>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.mute }}>SETS</span>
            </div>
          </div>
          <div>
            <span style={tag()}>VS LAST WK</span>
            <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 600, color: vsLastWeekPct >= 0 ? C.lime : '#ff4423', marginTop: 4 }}>
              {vsLastWeekPct >= 0 ? '+' : ''}{vsLastWeekPct}%
            </div>
          </div>
          <div>
            <span style={tag()}>4 WK AVG</span>
            <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 600, color: C.fg, marginTop: 4 }}>{avg4wk} SETS</div>
          </div>
        </div>
      </div>

      {/* Score trend */}
      <div style={{ padding: '30px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={tag()}>SCORE TREND</span>
          <span style={tag(C.fg2)}>LAST {Math.min(sessions.length, 11)} SESSIONS</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 1, background: C.line }}>
          {([
            ['TOTAL SCORE', String(score?.total_score ?? 0), `+${sessions[0]?.score_awarded ?? 0} LAST`],
            ['WEEKLY SCORE', String(score?.weekly_score ?? 0), ''],
            ['LEVEL', String(score?.level ?? 1), ''],
            ['STREAK', `${score?.current_streak ?? 0} DAYS`, ''],
          ] as [string, string, string][]).map(([n, v, d]) => (
            <div key={n} style={{ background: C.bg, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div>
                  <span style={tag()}>{n}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <span style={{ fontFamily: F.disp, fontSize: 34, fontWeight: 700, color: C.fg, letterSpacing: '-0.005em' }}>{v}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {d && <div style={{ fontFamily: F.mono, fontSize: 11, color: C.lime, letterSpacing: '0.08em' }}>{d}</div>}
                  <SparkLine pts={scorePts} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div style={{ padding: '30px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={tag()}>CONSISTENCY · 12 WEEKS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="11" height="11" viewBox="0 0 16 16"><path d="M8 1c0 3-4 4-4 8a4 4 0 008 0c0-2-1-3-2-4 1 0 2 1 2 2 1-2-1-5-4-6z" fill={C.lime}/></svg>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.lime, letterSpacing: '0.08em' }}>
              {score?.current_streak ?? 0} DAY STREAK
            </span>
          </div>
        </div>
        <Heatmap sessionDates={sessionDates} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
          {([['REST', C.line2], ['TRAINED', C.lime]] as [string, string][]).map(([l, bg]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 9, height: 9, background: bg }} />
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.mute, letterSpacing: '0.08em' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent sessions as milestones */}
      <div style={{ padding: '30px 24px 0' }}>
        <span style={tag()}>RECENT SESSIONS</span>
        {milestones.length === 0 ? (
          <div style={{ marginTop: 14, fontFamily: F.mono, fontSize: 10, color: C.mute, letterSpacing: '0.08em', lineHeight: 1.6 }}>
            COMPLETE YOUR FIRST SESSION TO SEE DATA HERE.
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            {milestones.map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 0', borderBottom: i < milestones.length - 1 ? '1px solid ' + C.line : 'none',
              }}>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, width: 54, letterSpacing: '0.08em' }}>{m.date}</span>
                {m.star && <span style={{ color: C.lime }}>★</span>}
                <span style={{ flex: 1, fontFamily: F.disp, fontSize: 16, fontWeight: 500, color: C.fg, letterSpacing: '0.02em' }}>{m.title}</span>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.lime, letterSpacing: '0.08em' }}>{m.badge}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
