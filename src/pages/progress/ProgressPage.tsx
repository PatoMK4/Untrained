import { useSessionHistory, useScore } from '@/hooks/useScore'

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

function SparkLine() {
  const pts = [10, 18, 14, 22, 19, 28, 26, 34, 38, 42, 48]
  const max = 50
  const w = 80, h = 22
  const path = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * w
    const y = h - (v / max) * h
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ marginTop: 6 }}>
      <path d={path} fill="none" stroke={C.lime} strokeWidth="1.4"/>
      <circle cx={w} cy={h - (pts[pts.length-1]/max)*h} r="2" fill={C.lime}/>
    </svg>
  )
}

function Heatmap() {
  const cells = Array.from({ length: 12 * 7 }).map((_, i) => {
    const day = i % 7
    const rest = day === 1 || day === 3 || day === 6
    if (rest) return 0
    return Math.random() > 0.4 ? 1 : 0.4
  })
  return (
    <div style={{ marginTop: 12, display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gap: 3 }}>
      {cells.map((v, i) => (
        <div key={i} style={{
          aspectRatio: '1',
          background: v === 0 ? C.line2 : C.lime,
          opacity: v === 0 ? 1 : (v < 1 ? 0.4 : 1),
        }}/>
      ))}
    </div>
  )
}

export default function ProgressPage() {
  const { data: history } = useSessionHistory()
  const { data: score } = useScore()

  const sessions = (history ?? []) as { date: string; total_sets: number; total_reps: number; score_awarded: number; session_type: string }[]

  const weeks = [6.2, 7.1, 7.4, 5.8, 8.0, 8.6, 9.0, 7.2, 9.4, 10.2, 11.1, 12.4]
  const maxV = Math.max(...weeks)

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, overflowY: 'auto', paddingBottom: 120 }}>
      <div style={{ padding: '68px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={tag()}>SINCE FEB 18 · {sessions.length} SESSIONS</span>
          <span style={tag(C.fg2)}>↓ EXPORT</span>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 70, color: C.fg, lineHeight: 0.9, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            You're<br/>+34% up.
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.06em', marginTop: 8, lineHeight: 1.5 }}>
            TOTAL WEEKLY VOLUME · 12 WEEK TREND
          </div>
        </div>
      </div>

      {/* Volume chart */}
      <div style={{ padding: '22px 24px 0' }}>
        <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          {weeks.map((v, i) => {
            const h = (v / maxV) * 100
            const isLast = i === weeks.length - 1
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
              <span style={{ fontFamily: F.disp, fontSize: 30, fontWeight: 700, color: C.lime }}>12.4</span>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.mute }}>K LB</span>
            </div>
          </div>
          <div>
            <span style={tag()}>VS LAST WK</span>
            <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 600, color: C.lime, marginTop: 4 }}>+11.7%</div>
          </div>
          <div>
            <span style={tag()}>4 WK AVG</span>
            <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 600, color: C.fg, marginTop: 4 }}>10.8K</div>
          </div>
        </div>
      </div>

      {/* 1RM cards */}
      <div style={{ padding: '30px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={tag()}>ESTIMATED 1RM</span>
          <span style={tag()}>LAST 12 WK</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 1, background: C.line }}>
          {[
            ['BENCH', '205', '+18', '+9.6%'],
            ['SQUAT', '280', '+25', '+9.8%'],
            ['DEADLIFT', '345', '+30', '+9.5%'],
            ['OHP', '135', '+10', '+8.0%'],
          ].map(([n, v, d, p]) => (
            <div key={n} style={{ background: C.bg, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div>
                  <span style={tag()}>{n}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <span style={{ fontFamily: F.disp, fontSize: 34, fontWeight: 700, color: C.fg, letterSpacing: '-0.005em' }}>{v}</span>
                    <span style={{ fontFamily: F.mono, fontSize: 11, color: C.mute }}>LB</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: F.mono, fontSize: 11, color: C.lime, letterSpacing: '0.08em' }}>{d} LB · {p}</div>
                  <SparkLine />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div style={{ padding: '30px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={tag()}>CONSISTENCY · MAR–MAY</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="11" height="11" viewBox="0 0 16 16"><path d="M8 1c0 3-4 4-4 8a4 4 0 008 0c0-2-1-3-2-4 1 0 2 1 2 2 1-2-1-5-4-6z" fill={C.lime}/></svg>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.lime, letterSpacing: '0.08em' }}>
              {score?.streak_days ?? 11} DAY STREAK
            </span>
          </div>
        </div>
        <Heatmap />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
          {[['REST', C.line2, 1], ['LIGHT', C.lime, 0.4], ['HEAVY', C.lime, 1]].map(([l, bg, op]) => (
            <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 9, height: 9, background: String(bg), opacity: Number(op) }} />
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.mute, letterSpacing: '0.08em' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div style={{ padding: '30px 24px 0' }}>
        <span style={tag()}>RECENT MILESTONES</span>
        <div style={{ marginTop: 14 }}>
          {[
            ['MAY 12', 'BENCH 190 × 8', '+5 LB', true],
            ['MAY 10', 'DEADLIFT 315 × 5', 'VOL PR', false],
            ['MAY 03', '11 DAY STREAK', 'LONGEST', false],
            ['APR 27', 'SQUAT 275 × 3', '+10 LB', true],
            ['APR 19', 'OHP 130 × 5', '+5 LB', true],
          ].map(([d, t, m, star], i, a) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 0', borderBottom: i < a.length - 1 ? '1px solid ' + C.line : 'none',
            }}>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, width: 54, letterSpacing: '0.08em' }}>{String(d)}</span>
              {star && <span style={{ color: C.lime }}>★</span>}
              <span style={{ flex: 1, fontFamily: F.disp, fontSize: 16, fontWeight: 500, color: C.fg, letterSpacing: '0.02em' }}>{String(t)}</span>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.lime, letterSpacing: '0.08em' }}>{String(m)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Score */}
      {score && (
        <div style={{ padding: '30px 24px 0' }}>
          <span style={tag()}>YOUR SCORE</span>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line }}>
            {[
              ['TOTAL', String(score.total_score ?? 0) + ' PTS'],
              ['LEVEL', String(score.level ?? 1)],
              ['STREAK', String(score.streak_days ?? 0) + ' DAYS'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: C.bg, padding: '14px 12px' }}>
                <span style={tag()}>{k}</span>
                <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 700, color: C.lime, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
